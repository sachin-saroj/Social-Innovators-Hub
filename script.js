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

// ==========================================================================
// AUTHENTICATION UTILITIES & VALIDATION
// ==========================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(fieldId, errorId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  if (!input || !errorEl) return;

  if (message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    errorEl.textContent = message;
    errorEl.classList.add('show');
  } else {
    input.classList.remove('is-invalid');
    if (input.value && input.value.trim().length > 0) {
      input.classList.add('is-valid');
    } else {
      input.classList.remove('is-valid');
    }
    errorEl.textContent = '';
    errorEl.classList.remove('show');
  }
}

function setFormBanner(bannerId, message, type = 'error') {
  const banner = document.getElementById(bannerId);
  if (!banner) return;
  if (message) {
    banner.className = `form-banner ${type}`;
    banner.textContent = message;
    banner.classList.remove('hidden');
  } else {
    banner.className = 'form-banner hidden';
    banner.textContent = '';
  }
}

function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
    el.classList.remove('show');
  });
  form.querySelectorAll('input, select, textarea').forEach((el) => {
    el.classList.remove('is-invalid');
    el.classList.remove('is-valid');
  });
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;
  const btnText = button.querySelector('.btn-text');
  const spinner = button.querySelector('.btn-spinner');
  button.disabled = isLoading;
  if (isLoading) {
    if (btnText) btnText.textContent = loadingText;
    if (spinner) spinner.classList.remove('hidden');
  } else {
    if (btnText) btnText.textContent = defaultText;
    if (spinner) spinner.classList.add('hidden');
  }
}

function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: 'Enter password', cls: '' };
  }
  if (password.length < 8) {
    return { score: 1, label: 'Weak (min 8 chars)', cls: 'weak' };
  }

  let factors = 0;
  if (/[a-z]/.test(password)) factors++;
  if (/[A-Z]/.test(password)) factors++;
  if (/[0-9]/.test(password)) factors++;
  if (/[^a-zA-Z0-9]/.test(password)) factors++;

  if (factors >= 3 && password.length >= 10) {
    return { score: 4, label: 'Strong', cls: 'strong' };
  }
  if (factors >= 3 || (factors >= 2 && password.length >= 10)) {
    return { score: 3, label: 'Good', cls: 'good' };
  }
  if (factors >= 2) {
    return { score: 2, label: 'Fair', cls: 'fair' };
  }
  return { score: 1, label: 'Weak', cls: 'weak' };
}

function updatePasswordMeter(password) {
  const meterWrap = document.getElementById('regPasswordMeter');
  const barFill = document.getElementById('meterBarFill');
  const labelText = document.getElementById('meterLabelText');
  if (!meterWrap || !barFill || !labelText) return;

  if (!password) {
    meterWrap.classList.remove('active');
    barFill.className = 'meter-bar-fill';
    labelText.className = 'meter-text';
    labelText.textContent = 'Enter password';
    return;
  }

  meterWrap.classList.add('active');
  const result = evaluatePasswordStrength(password);
  barFill.className = `meter-bar-fill ${result.cls}`;
  labelText.className = `meter-text ${result.cls}`;
  labelText.textContent = result.label;
}

// Field-level validators
function validateLoginEmail(showError = true) {
  const input = document.getElementById('loginEmail');
  if (!input) return false;
  const val = input.value.trim();
  if (!val) {
    if (showError) setFieldError('loginEmail', 'loginEmailError', 'Email address is required.');
    return false;
  }
  if (!EMAIL_REGEX.test(val)) {
    if (showError) setFieldError('loginEmail', 'loginEmailError', 'Please enter a valid email address.');
    return false;
  }
  setFieldError('loginEmail', 'loginEmailError', '');
  return true;
}

function validateLoginPassword(showError = true) {
  const input = document.getElementById('loginPassword');
  if (!input) return false;
  if (!input.value) {
    if (showError) setFieldError('loginPassword', 'loginPasswordError', 'Password is required.');
    return false;
  }
  setFieldError('loginPassword', 'loginPasswordError', '');
  return true;
}

function validateRegName(showError = true) {
  const input = document.getElementById('regName');
  if (!input) return false;
  const val = input.value.trim();
  if (!val) {
    if (showError) setFieldError('regName', 'regNameError', 'Full name is required.');
    return false;
  }
  if (val.length < 2 || val.length > 60) {
    if (showError) setFieldError('regName', 'regNameError', 'Name must be between 2 and 60 characters.');
    return false;
  }
  setFieldError('regName', 'regNameError', '');
  return true;
}

function validateRegPhone(showError = true) {
  const input = document.getElementById('regPhone');
  if (!input) return false;
  const val = input.value.trim();
  if (val && !/^[0-9+\-\s()]{4,20}$/.test(val)) {
    if (showError) setFieldError('regPhone', 'regPhoneError', 'Enter a valid phone number (digits, +, -) or leave blank.');
    return false;
  }
  setFieldError('regPhone', 'regPhoneError', '');
  return true;
}

function validateRegEmail(showError = true) {
  const input = document.getElementById('regEmail');
  if (!input) return false;
  const val = input.value.trim();
  if (!val) {
    if (showError) setFieldError('regEmail', 'regEmailError', 'Email address is required.');
    return false;
  }
  if (val.length > 100 || !EMAIL_REGEX.test(val)) {
    if (showError) setFieldError('regEmail', 'regEmailError', 'Please enter a valid email address.');
    return false;
  }
  setFieldError('regEmail', 'regEmailError', '');
  return true;
}

function validateRegCity(showError = true) {
  const input = document.getElementById('regCity');
  if (!input) return true;
  const val = input.value.trim();
  if (val.length > 60) {
    if (showError) setFieldError('regCity', 'regCityError', 'City cannot exceed 60 characters.');
    return false;
  }
  setFieldError('regCity', 'regCityError', '');
  return true;
}

function validateRegRole(showError = true) {
  const select = document.getElementById('regRole');
  if (!select) return false;
  const allowed = ['Student', 'Citizen', 'Community Member'];
  if (!select.value || !allowed.includes(select.value)) {
    if (showError) setFieldError('regRole', 'regRoleError', 'Please select an account type.');
    return false;
  }
  setFieldError('regRole', 'regRoleError', '');
  return true;
}

function validateRegPassword(showError = true) {
  const input = document.getElementById('regPassword');
  if (!input) return false;
  const val = input.value;
  if (!val) {
    if (showError) setFieldError('regPassword', 'regPasswordError', 'Password is required.');
    return false;
  }
  if (val.length < 8) {
    if (showError) setFieldError('regPassword', 'regPasswordError', 'Password must be at least 8 characters long.');
    return false;
  }
  if (val.length > 128) {
    if (showError) setFieldError('regPassword', 'regPasswordError', 'Password cannot exceed 128 characters.');
    return false;
  }
  setFieldError('regPassword', 'regPasswordError', '');
  return true;
}

function validateRegConfirmPassword(showError = true) {
  const password = document.getElementById('regPassword')?.value || '';
  const confirmInput = document.getElementById('regConfirmPassword');
  if (!confirmInput) return false;
  const val = confirmInput.value;
  if (!val) {
    if (showError) setFieldError('regConfirmPassword', 'regConfirmPasswordError', 'Please confirm your password.');
    return false;
  }
  if (val !== password) {
    if (showError) setFieldError('regConfirmPassword', 'regConfirmPasswordError', 'Passwords do not match.');
    return false;
  }
  setFieldError('regConfirmPassword', 'regConfirmPasswordError', '');
  return true;
}

function initPasswordToggles() {
  document.querySelectorAll('.password-toggle-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.textContent = isPassword ? '🙈' : '👁️';
      button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });
}

// ==========================================================================
// AUTHENTICATION HANDLERS
// ==========================================================================

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormBanner('loginMessage', '');

  const isEmailValid = validateLoginEmail(true);
  const isPassValid = validateLoginPassword(true);
  if (!isEmailValid || !isPassValid) {
    return;
  }

  const submitBtn = document.getElementById('loginSubmitBtn');
  setButtonLoading(submitBtn, true, 'Signing In...', 'Sign In');

  const payload = {
    email: document.getElementById('loginEmail').value.trim().toLowerCase(),
    password: document.getElementById('loginPassword').value,
  };

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveSession(data.user, data.token);
    form.reset();
    clearFormErrors('loginForm');
    closeModal('loginModal');
    updateAuthButtons();
    renderDashboardShell();
    if (isAdmin()) {
      loadAdminReports();
    }
    showToast(`Welcome back, ${data.user.name}!`, 'success');
  } catch (error) {
    setFormBanner('loginMessage', error.message || 'Invalid email or password.', 'error');
  } finally {
    setButtonLoading(submitBtn, false, 'Signing In...', 'Sign In');
  }
}

async function handleDemoAdminLogin() {
  setFormBanner('loginMessage', '');
  const adminBtn = document.getElementById('demoAdminLoginBtn');
  if (adminBtn) adminBtn.disabled = true;

  try {
    const data = await apiRequest('/api/auth/demo-admin', { method: 'POST' });
    saveSession(data.user, data.token);
    clearFormErrors('loginForm');
    closeModal('loginModal');
    updateAuthButtons();
    renderDashboardShell();
    loadAdminReports();
    showToast('Signed in as Demo Administrator.', 'success');
  } catch (error) {
    setFormBanner('loginMessage', error.message, 'error');
  } finally {
    if (adminBtn) adminBtn.disabled = false;
  }
}

async function handleDemoCitizenLogin() {
  setFormBanner('loginMessage', '');
  const citizenBtn = document.getElementById('demoCitizenLoginBtn');
  if (citizenBtn) citizenBtn.disabled = true;

  try {
    const data = await apiRequest('/api/auth/demo-citizen', { method: 'POST' });
    saveSession(data.user, data.token);
    clearFormErrors('loginForm');
    closeModal('loginModal');
    updateAuthButtons();
    renderDashboardShell();
    showToast('Signed in as Demo Citizen.', 'success');
  } catch (error) {
    setFormBanner('loginMessage', error.message, 'error');
  } finally {
    if (citizenBtn) citizenBtn.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormBanner('registerMessage', '');

  const vName = validateRegName(true);
  const vPhone = validateRegPhone(true);
  const vEmail = validateRegEmail(true);
  const vCity = validateRegCity(true);
  const vRole = validateRegRole(true);
  const vPass = validateRegPassword(true);
  const vConfirm = validateRegConfirmPassword(true);

  if (!vName || !vPhone || !vEmail || !vCity || !vRole || !vPass || !vConfirm) {
    return;
  }

  const submitBtn = document.getElementById('regSubmitBtn');
  setButtonLoading(submitBtn, true, 'Creating Account...', 'Create Account');

  const payload = {
    name: document.getElementById('regName').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    email: document.getElementById('regEmail').value.trim().toLowerCase(),
    city: document.getElementById('regCity').value.trim(),
    role: document.getElementById('regRole').value,
    password: document.getElementById('regPassword').value,
    confirmPassword: document.getElementById('regConfirmPassword').value,
  };

  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    saveSession(data.user, data.token);
    form.reset();
    clearFormErrors('registerForm');
    updatePasswordMeter('');
    closeModal('registerModal');
    updateAuthButtons();
    renderDashboardShell();
    showToast('Account created successfully! Welcome to the Hub.', 'success');
  } catch (error) {
    setFormBanner('registerMessage', error.message || 'Registration failed.', 'error');
  } finally {
    setButtonLoading(submitBtn, false, 'Creating Account...', 'Create Account');
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
    console.warn('[LOGOUT]:', error.message);
  } finally {
    clearSession();
    updateAuthButtons();
    renderDashboardShell();
    const tbody = document.getElementById('adminReportTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Admin reports are hidden until you sign in as admin.</div></td></tr>';
    }
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
  // Navigation & buttons
  document.getElementById('loginBtn')?.addEventListener('click', () => {
    clearFormErrors('loginForm');
    setFormBanner('loginMessage', '');
    openModal('loginModal');
    document.getElementById('loginEmail')?.focus();
  });

  document.getElementById('registerBtn')?.addEventListener('click', () => {
    clearFormErrors('registerForm');
    setFormBanner('registerMessage', '');
    updatePasswordMeter('');
    openModal('registerModal');
    document.getElementById('regName')?.focus();
  });

  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('exploreBtn')?.addEventListener('click', () => document.getElementById('hackathons')?.scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('problemBtn')?.addEventListener('click', () => document.getElementById('problemSection')?.scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('demoAdminLoginBtn')?.addEventListener('click', handleDemoAdminLogin);
  document.getElementById('demoCitizenLoginBtn')?.addEventListener('click', handleDemoCitizenLogin);

  // Modal switcher links
  document.getElementById('switchToRegisterBtn')?.addEventListener('click', () => {
    closeModal('loginModal');
    clearFormErrors('registerForm');
    setFormBanner('registerMessage', '');
    updatePasswordMeter('');
    openModal('registerModal');
    document.getElementById('regName')?.focus();
  });

  document.getElementById('switchToLoginBtn')?.addEventListener('click', () => {
    closeModal('registerModal');
    clearFormErrors('loginForm');
    setFormBanner('loginMessage', '');
    openModal('loginModal');
    document.getElementById('loginEmail')?.focus();
  });

  // Password visibility toggles
  initPasswordToggles();

  // Real-time password meter
  const regPassInput = document.getElementById('regPassword');
  if (regPassInput) {
    regPassInput.addEventListener('input', (e) => {
      updatePasswordMeter(e.target.value);
      if (e.target.value.length >= 8) {
        validateRegPassword(false);
      }
    });
    regPassInput.addEventListener('blur', () => validateRegPassword(true));
  }

  // Field validation listeners (on blur and input cleanup)
  document.getElementById('loginEmail')?.addEventListener('blur', () => validateLoginEmail(true));
  document.getElementById('loginEmail')?.addEventListener('input', () => {
    if (document.getElementById('loginEmail').classList.contains('is-invalid')) {
      validateLoginEmail(false);
    }
  });

  document.getElementById('loginPassword')?.addEventListener('blur', () => validateLoginPassword(true));
  document.getElementById('loginPassword')?.addEventListener('input', () => {
    if (document.getElementById('loginPassword').classList.contains('is-invalid')) {
      validateLoginPassword(false);
    }
  });

  document.getElementById('regName')?.addEventListener('blur', () => validateRegName(true));
  document.getElementById('regName')?.addEventListener('input', () => {
    if (document.getElementById('regName').classList.contains('is-invalid')) validateRegName(false);
  });

  document.getElementById('regPhone')?.addEventListener('blur', () => validateRegPhone(true));
  document.getElementById('regPhone')?.addEventListener('input', () => {
    if (document.getElementById('regPhone').classList.contains('is-invalid')) validateRegPhone(false);
  });

  document.getElementById('regEmail')?.addEventListener('blur', () => validateRegEmail(true));
  document.getElementById('regEmail')?.addEventListener('input', () => {
    if (document.getElementById('regEmail').classList.contains('is-invalid')) validateRegEmail(false);
  });

  document.getElementById('regCity')?.addEventListener('blur', () => validateRegCity(true));

  document.getElementById('regRole')?.addEventListener('change', () => validateRegRole(true));

  document.getElementById('regConfirmPassword')?.addEventListener('blur', () => validateRegConfirmPassword(true));
  document.getElementById('regConfirmPassword')?.addEventListener('input', () => {
    if (document.getElementById('regConfirmPassword').classList.contains('is-invalid')) {
      validateRegConfirmPassword(false);
    }
  });

  // Form submissions
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('problemForm')?.addEventListener('submit', handleProblemSubmit);
  document.getElementById('contactForm')?.addEventListener('submit', handleContactSubmit);
  document.getElementById('applyReportFilters')?.addEventListener('click', loadAdminReports);
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportReportsCsv);
  document.getElementById('reportSearch')?.addEventListener('input', (event) => {
    appState.reportFilters.search = event.target.value;
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.close));
  });

  // Backdrop click to close modals
  window.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('modal')) {
      closeModal(target.id);
    }
  });

  // Keyboard accessibility: ESC key to close active modal
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal:not(.hidden)');
      openModals.forEach((modal) => closeModal(modal.id));
    }
  });
}

// Session verification with backend GET /api/auth/me
async function restoreSession() {
  const token = localStorage.getItem('socialHubToken');
  if (!token) {
    clearSession();
    return;
  }

  appState.token = token;

  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.user) {
        appState.currentUser = data.user;
        localStorage.setItem('socialHubUser', JSON.stringify(data.user));
        return;
      }
    }

    // Token is invalid, expired, or user deleted
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      console.warn('[AUTH]: Session invalid or expired. Resetting client session.');
      clearSession();
      showToast('Your session has expired. Please sign in again.', 'warning');
    }
  } catch (networkError) {
    console.warn('[AUTH]: Unable to reach server to verify session. Attempting cached restore.');
    const savedUser = localStorage.getItem('socialHubUser');
    if (savedUser) {
      try {
        appState.currentUser = JSON.parse(savedUser);
      } catch (e) {
        clearSession();
      }
    }
  }
}

async function initApp() {
  disableNativeValidation();
  bindUi();
  await restoreSession();
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