const appState = {
  currentUser: null,
  token: localStorage.getItem('socialHubToken') || '',
  reports: [],
  reportFilters: {
    search: '',
    category: 'All',
    status: 'All',
    urgency: 'All',
  },
};

function showToast(message, variant = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${variant}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = 'toast';
  }, 2600);
}

function setFormMessage(id, message, type = 'success') {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message;
  node.style.color = type === 'error' ? '#d64242' : type === 'warning' ? '#9d6a00' : '#1b9c6a';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function isAdmin() {
  return appState.currentUser && appState.currentUser.role === 'Admin';
}

function saveSession(user, token) {
  appState.currentUser = user;
  appState.token = token;
  localStorage.setItem('socialHubUser', JSON.stringify(user));
  localStorage.setItem('socialHubToken', token);
}

function clearSession() {
  appState.currentUser = null;
  appState.token = '';
  localStorage.removeItem('socialHubUser');
  localStorage.removeItem('socialHubToken');
}

function updateAuthButtons() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminSection = document.getElementById('adminReportsSection');

  const loggedIn = Boolean(appState.currentUser);
  if (loginBtn) loginBtn.classList.toggle('hidden', loggedIn);
  if (registerBtn) registerBtn.classList.toggle('hidden', loggedIn);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);

  if (adminSection) {
    adminSection.classList.toggle('hidden', !isAdmin());
  }
}

async function apiRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (appState.token) {
    headers.Authorization = `Bearer ${appState.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  const payload = response.headers.get('Content-Type')?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload.message || 'Request failed.';
    throw new Error(message);
  }

  return payload;
}

function renderDashboardShell() {
  const root = document.getElementById('dashboardContent');
  if (!root) return;

  if (!appState.currentUser) {
    root.innerHTML = '<div class="empty-state">Please log in to view your dashboard.</div>';
    return;
  }

  root.innerHTML = `
    <div class="dashboard-grid">
      <div class="kpi-box"><strong>${appState.currentUser.name}</strong><span>Logged in as ${appState.currentUser.role}</span></div>
      <div class="kpi-box"><strong>${appState.currentUser.email}</strong><span>Email</span></div>
      <div class="kpi-box"><strong>${appState.currentUser.city || 'N/A'}</strong><span>City</span></div>
      <div class="kpi-box"><strong>${appState.currentUser.role === 'Admin' ? 'Admin Panel' : 'Community User'}</strong><span>Access level</span></div>
    </div>
  `;
}

async function loadStats() {
  try {
    const data = await apiRequest('/api/dashboard/stats');
    const statMap = {
      statUsers: data.totalUsers,
      statHackathons: data.totalHackathons,
      statProblems: data.totalProblems,
      statTeams: data.totalTeams,
      statImpact: data.totalImpact,
    };

    Object.entries(statMap).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });
  } catch (error) {
    console.warn('Dashboard stats unavailable:', error.message);
  }
}

function renderReportsTable(reports) {
  const tbody = document.getElementById('adminReportTableBody');
  if (!tbody) return;

  if (!reports.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No matching reports found.</div></td></tr>';
    return;
  }

  tbody.innerHTML = reports.map((report) => `
    <tr>
      <td>
        <strong>${report.title}</strong><br>
        <small>${report.description}</small>
      </td>
      <td>${report.category}</td>
      <td>${report.city || 'N/A'}</td>
      <td>${report.urgency}</td>
      <td><span class="status-pill ${report.status.toLowerCase()}">${report.status}</span></td>
      <td>${new Date(report.created_at).toLocaleDateString()}</td>
      <td>
        <div class="table-actions">
          <button class="action-btn approve" data-report-id="${report.id}" data-status="Approved">Approve</button>
          <button class="action-btn reject" data-report-id="${report.id}" data-status="Rejected">Reject</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-report-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.reportId);
      const status = button.dataset.status;
      const feedback = status === 'Approved' ? 'Approved by demo admin after verification.' : 'Rejected by demo admin after review.';

      try {
        await apiRequest(`/api/admin/reports/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status, feedback }),
        });
        showToast(`Report ${status.toLowerCase()} successfully.`);
        loadAdminReports();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
}

function renderAdminSummary(summary) {
  const root = document.getElementById('adminSummary');
  if (!root) return;

  if (!summary || !summary.totalReports && summary.totalReports !== 0) {
    root.innerHTML = '<div class="empty-state">Admin summary is unavailable.</div>';
    return;
  }

  const cards = [
    { label: 'Total reports', value: summary.totalReports },
    { label: 'Pending', value: summary.pending },
    { label: 'Approved', value: summary.approved },
    { label: 'Rejected', value: summary.rejected },
    { label: 'High priority', value: summary.highPriority },
    { label: 'People affected', value: summary.peopleAffected },
  ];

  root.innerHTML = cards.map((card) => `
    <div class="kpi-box">
      <strong>${card.value}</strong>
      <span>${card.label}</span>
    </div>
  `).join('');
}

async function loadAdminReports() {
  if (!isAdmin()) return;

  const filters = {
    search: document.getElementById('reportSearch')?.value || '',
    category: document.getElementById('reportCategory')?.value || 'All',
    status: document.getElementById('reportStatus')?.value || 'All',
    urgency: document.getElementById('reportUrgency')?.value || 'All',
  };

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'All') params.set(key, value);
  });

  try {
    const data = await apiRequest(`/api/admin/reports?${params.toString()}`);
    appState.reports = data.reports || [];
    renderAdminSummary(data.stats);
    renderReportsTable(appState.reports);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function exportReportsCsv() {
  if (!isAdmin()) {
    showToast('Admin access required to export reports.', 'error');
    return;
  }

  const params = new URLSearchParams();
  const filters = {
    search: document.getElementById('reportSearch')?.value || '',
    category: document.getElementById('reportCategory')?.value || 'All',
    status: document.getElementById('reportStatus')?.value || 'All',
    urgency: document.getElementById('reportUrgency')?.value || 'All',
  };

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'All') params.set(key, value);
  });

  const url = `/api/admin/reports/export?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${appState.token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    showToast(message || 'CSV export failed.', 'error');
    return;
  }

  const blob = await response.blob();
  const anchor = document.createElement('a');
  const downloadUrl = window.URL.createObjectURL(blob);
  anchor.href = downloadUrl;
  anchor.download = 'social-innovators-community-reports.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);
  showToast('CSV exported successfully.');
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveSession(data.user, data.token);
    form.reset();
    closeModal('loginModal');
    updateAuthButtons();
    renderDashboardShell();
    if (isAdmin()) {
      loadAdminReports();
    }
    showToast('Login successful.');
  } catch (error) {
    setFormMessage('loginMessage', error.message, 'error');
  }
}

async function handleDemoAdminLogin() {
  try {
    const data = await apiRequest('/api/auth/demo-admin', { method: 'POST' });
    saveSession(data.user, data.token);
    closeModal('loginModal');
    updateAuthButtons();
    renderDashboardShell();
    loadAdminReports();
    showToast('Demo admin login successful.');
  } catch (error) {
    setFormMessage('loginMessage', error.message, 'error');
  }
}

async function handleDemoCitizenLogin() {
  try {
    const data = await apiRequest('/api/auth/demo-citizen', { method: 'POST' });
    saveSession(data.user, data.token);
    closeModal('loginModal');
    updateAuthButtons();
    renderDashboardShell();
    showToast('Demo citizen login successful.');
  } catch (error) {
    setFormMessage('loginMessage', error.message, 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveSession(data.user, data.token);
    form.reset();
    closeModal('registerModal');
    updateAuthButtons();
    renderDashboardShell();
    showToast('Account created successfully.');
  } catch (error) {
    setFormMessage('registerMessage', error.message, 'error');
  }
}

async function handleLogout() {
  try {
    if (appState.token) {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    }
  } catch (error) {
    console.warn(error.message);
  } finally {
    clearSession();
    updateAuthButtons();
    renderDashboardShell();
    document.getElementById('adminReportTableBody').innerHTML = '<tr><td colspan="7"><div class="empty-state">Admin reports are hidden until you sign in as admin.</div></td></tr>';
    showToast('Logged out successfully.');
  }
}

async function handleProblemSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  if (!appState.currentUser) {
    setFormMessage('problemMessage', 'Please log in to submit a problem.', 'error');
    openModal('loginModal');
    return;
  }

  try {
    await apiRequest('/api/problems', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    form.reset();
    setFormMessage('problemMessage', 'Problem submitted for review.', 'success');
    loadStats();
    if (isAdmin()) loadAdminReports();
  } catch (error) {
    setFormMessage('problemMessage', error.message, 'error');
  }
}

async function handleContactSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await apiRequest('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    form.reset();
    setFormMessage('contactMessage', 'Your message was sent successfully.', 'success');
  } catch (error) {
    setFormMessage('contactMessage', error.message, 'error');
  }
}

function disableNativeValidation() {
  document.querySelectorAll('form').forEach((form) => {
    form.setAttribute('novalidate', 'novalidate');
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      field.setCustomValidity('');
      field.addEventListener('invalid', (event) => {
        event.preventDefault();
        event.target.setCustomValidity('');
      });
    });
  });
}

function bindUi() {
  document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
  document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('exploreBtn')?.addEventListener('click', () => document.getElementById('hackathons')?.scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('problemBtn')?.addEventListener('click', () => document.getElementById('problemSection')?.scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('demoAdminLoginBtn')?.addEventListener('click', handleDemoAdminLogin);
  document.getElementById('demoCitizenLoginBtn')?.addEventListener('click', handleDemoCitizenLogin);
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('problemForm')?.addEventListener('submit', handleProblemSubmit);
  document.getElementById('contactForm')?.addEventListener('submit', handleContactSubmit);
  document.getElementById('applyReportFilters')?.addEventListener('click', loadAdminReports);
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportReportsCsv);
  document.getElementById('reportSearch')?.addEventListener('input', (event) => {
    appState.reportFilters.search = event.target.value;
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.close));
  });

  window.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('modal')) {
      closeModal(target.id);
    }
  });
}

function restoreSession() {
  const savedUser = localStorage.getItem('socialHubUser');
  if (savedUser && appState.token) {
    try {
      appState.currentUser = JSON.parse(savedUser);
    } catch (error) {
      clearSession();
    }
  }
}

async function initApp() {
  disableNativeValidation();
  bindUi();
  restoreSession();
  updateAuthButtons();
  renderDashboardShell();
  await loadStats();

  if (isAdmin()) {
    loadAdminReports();
  } else {
    const tbody = document.getElementById('adminReportTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Admin reports are hidden until you sign in as admin.</div></td></tr>';
    }
  }
}

document.addEventListener('DOMContentLoaded', initApp);