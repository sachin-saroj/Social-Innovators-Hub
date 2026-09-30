const appState = {
  currentUser: null,
  token: localStorage.getItem('socialHubToken') || '',
  reports: [],
  cachedHackathons: [],
  cachedProblems: [],
  selectedChallengeForSquad: null,
  reportFilters: {
    search: '',
    category: 'All',
    status: 'All',
    urgency: 'All',
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, variant = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${variant}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

function setFormMessage(id, message, type = 'success') {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message;
  node.style.color = type === 'error' ? '#ef4444' : type === 'warning' ? '#b45309' : '#15803d';
}

function setFormBanner(id, message, type = 'error') {
  const banner = document.getElementById(id);
  if (!banner) return;
  if (!message) {
    banner.textContent = '';
    banner.className = 'form-banner hidden';
    return;
  }
  banner.textContent = message;
  banner.className = `form-banner ${type}`;
}

function setFieldError(fieldId, errorId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);
  if (input) {
    if (message) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }
  }
  if (errorEl) {
    errorEl.textContent = message || '';
  }
}

function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.is-invalid').forEach((el) => {
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
  });
  form.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
  });
}

function setButtonLoading(button, isLoading, loadingText = 'Processing...', defaultText = 'Submit') {
  if (!button) return;
  button.disabled = isLoading;
  const textSpan = button.querySelector('.btn-text');
  const spinner = button.querySelector('.btn-spinner');
  if (textSpan) {
    textSpan.textContent = isLoading ? loadingText : defaultText;
  }
  if (spinner) {
    spinner.classList.toggle('hidden', !isLoading);
  }
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
  const userChip = document.getElementById('userChip');
  const userChipName = document.getElementById('userChipName');
  const userChipRole = document.getElementById('userChipRole');
  const adminSection = document.getElementById('adminReportsSection');

  const loggedIn = Boolean(appState.currentUser);
  if (loginBtn) loginBtn.classList.toggle('hidden', loggedIn);
  if (registerBtn) registerBtn.classList.toggle('hidden', loggedIn);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);

  if (userChip) {
    userChip.classList.toggle('hidden', !loggedIn);
    if (loggedIn && appState.currentUser) {
      if (userChipName) userChipName.textContent = appState.currentUser.name;
      if (userChipRole) userChipRole.textContent = appState.currentUser.role;
    }
  }

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

  const payload = response.headers.get('Content-Type')?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload.message || 'Request failed.';
    throw new Error(message);
  }

  return payload;
}

// ==========================================================================
// INNOVATOR DASHBOARD (REAL, LOGICAL, MULTI-ROLE COMMAND CENTER)
// ==========================================================================

async function renderDashboardShell() {
  const root = document.getElementById('dashboardContent');
  if (!root) return;

  // 1. Logged Out State: Professional Command Center Onboarding & Instant Role Preview
  if (!appState.currentUser) {
    root.innerHTML = `
      <div class="command-center-preview">
        <div style="text-align: center; max-width: 680px; margin: 0 auto;">
          <span class="eyebrow">Operating System</span>
          <h3 style="font-size: 1.75rem; margin-bottom: 8px;">Social Innovation Command Center</h3>
          <p class="body-md" style="color: var(--colors-muted);">
            A collaborative workspace uniting student engineers, municipal authorities, and citizens.
            Select a role to preview live hackathon squad rosters, real-time jury scoring, and verified community issues.
          </p>
        </div>

        <div class="role-preview-grid">
          <!-- Student Card -->
          <div class="role-preview-card">
            <div>
              <span class="category-badge" style="background: rgba(34, 197, 94, 0.12); color: #15803d;">Student / Innovator</span>
              <h4 style="margin-top: 12px;">Team HydraSensors</h4>
              <p>Register squads, match with verified civic challenges, submit IoT & software prototypes, and receive rubric evaluations from judges.</p>
              <div style="font-size: 0.8125rem; color: var(--colors-ink); margin-bottom: 16px;">
                <strong>Active Track:</strong> Water IoT Telemetry • <strong>Jury Score:</strong> 93/100
              </div>
            </div>
            <button type="button" class="primary-btn role-launch-btn" id="dashLaunchStudentBtn">
              Launch Student Workspace
            </button>
          </div>

          <!-- Citizen Card -->
          <div class="role-preview-card">
            <div>
              <span class="category-badge" style="background: rgba(255, 176, 132, 0.25); color: #9a3412;">Citizen / Reporter</span>
              <h4 style="margin-top: 12px;">Community Validator</h4>
              <p>Flag localized environmental breakdowns with geolocation and photos. Track verification by municipal authorities and adoption by hackathon squads.</p>
              <div style="font-size: 0.8125rem; color: var(--colors-ink); margin-bottom: 16px;">
                <strong>Reported:</strong> Bellandur Lake Foam • <strong>Status:</strong> Approved
              </div>
            </div>
            <button type="button" class="primary-btn role-launch-btn" id="dashLaunchCitizenBtn">
              Launch Citizen Workspace
            </button>
          </div>

          <!-- Admin Card -->
          <div class="role-preview-card">
            <div>
              <span class="category-badge" style="background: rgba(232, 185, 74, 0.25); color: #92400e;">Platform Admin</span>
              <h4 style="margin-top: 12px;">Review & Governance</h4>
              <p>Manage community incident queues, verify urgency, approve hackathon challenges, and export structured civic CSV audit data.</p>
              <div style="font-size: 0.8125rem; color: var(--colors-ink); margin-bottom: 16px;">
                <strong>Governance:</strong> 6 Verified Challenges • 3 Active Hackathons
              </div>
            </div>
            <button type="button" class="primary-btn role-launch-btn" id="dashLaunchAdminBtn">
              Launch Admin Console
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('dashLaunchStudentBtn')?.addEventListener('click', async () => {
      await quickLogin('student@socialhub.com', 'student123', 'Ananya Sharma (Student Innovator)');
    });
    document.getElementById('dashLaunchCitizenBtn')?.addEventListener('click', handleDemoCitizenLogin);
    document.getElementById('dashLaunchAdminBtn')?.addEventListener('click', handleDemoAdminLogin);
    return;
  }

  // 2. Logged In State: Fetch Full User Activity Profile
  try {
    root.innerHTML = '<div class="empty-state">Loading your personal innovation workspace...</div>';
    const activity = await apiRequest('/api/dashboard/my-activity');
    const u = activity?.user || state.currentUser;
    if (!u) {
      clearAuthSession();
      renderDashboardShell();
      return;
    }
    const m = activity?.metrics || {
      hackathonsCount: 0,
      teamsCount: 0,
      submissionsCount: 0,
      problemsCount: 0,
      unreadNotifications: 0,
    };

    const initials = (u.name || 'User')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    root.innerHTML = `
      <!-- User Profile Header -->
      <div class="dash-header-profile">
        <div class="dash-user-identity">
          <div class="dash-avatar-circle">${initials}</div>
          <div>
            <div class="dash-user-name">
              <span>${u.name}</span>
              <span class="category-badge" style="font-size: 0.75rem;">${u.role}</span>
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #059669; font-weight: 600; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 9999px;">
                <img src="/assets/images/logo.svg" alt="Hub Verified" style="width: 14px; height: 14px;" /> Verified Innovator
              </span>
            </div>
            <div class="dash-user-meta">${u.email} • Location: ${u.city || 'Bengaluru'}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="secondary-btn small" id="dashExploreMoreBtn">Explore Hackathons</button>
          <button type="button" class="primary-btn small" id="dashReportIssueBtn">Report New Issue</button>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="dashboard-grid" style="margin-bottom: var(--spacing-lg);">
        <div class="kpi-box">
          <strong>${m.hackathonsCount}</strong>
          <span>Registered Hackathons</span>
        </div>
        <div class="kpi-box">
          <strong>${m.teamsCount}</strong>
          <span>Innovation Squads</span>
        </div>
        <div class="kpi-box">
          <strong>${m.submissionsCount}</strong>
          <span>Project Submissions</span>
        </div>
        <div class="kpi-box">
          <strong>${m.unreadNotifications}</strong>
          <span>Unread Notifications</span>
        </div>
      </div>

      <!-- Dashboard Tabs Bar -->
      <div class="dash-tabs-bar" role="tablist">
        <button type="button" class="dash-tab-btn active" data-tab="tabSquads">🏆 My Squad & Project</button>
        <button type="button" class="dash-tab-btn" data-tab="tabHackathons">📅 Registered Hackathons (${m.hackathonsCount})</button>
        <button type="button" class="dash-tab-btn" data-tab="tabProblems">🌱 My Reported Issues (${m.problemsCount})</button>
        <button type="button" class="dash-tab-btn" data-tab="tabAlerts">🔔 Notifications (${m.unreadNotifications})</button>
      </div>

      <!-- Tab 1: My Squad & Project -->
      <div id="tabSquads" class="dash-tab-pane active">
        ${renderSquadsTab(activity.teams, activity.submissions)}
      </div>

      <!-- Tab 2: Registered Hackathons -->
      <div id="tabHackathons" class="dash-tab-pane">
        ${renderRegisteredHackathonsTab(activity.registeredHackathons)}
      </div>

      <!-- Tab 3: My Reported Issues -->
      <div id="tabProblems" class="dash-tab-pane">
        ${renderReportedProblemsTab(activity.reportedProblems)}
      </div>

      <!-- Tab 4: Notifications -->
      <div id="tabAlerts" class="dash-tab-pane">
        ${renderNotificationsTab(activity.notifications)}
      </div>
    `;

    // Tab switching event handlers
    root.querySelectorAll('.dash-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.dash-tab-btn').forEach((b) => b.classList.remove('active'));
        root.querySelectorAll('.dash-tab-pane').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.getElementById(target)?.classList.add('active');
      });
    });

    document.getElementById('dashExploreMoreBtn')?.addEventListener('click', () => {
      document.getElementById('hackathons')?.scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('dashReportIssueBtn')?.addEventListener('click', () => {
      document.getElementById('problemSection')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Mark notification as read
    root.querySelectorAll('.mark-read-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.notifId;
        try {
          await apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' });
          btn.parentElement.style.opacity = '0.5';
          btn.remove();
          showToast('Notification marked as read.');
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });
  } catch (err) {
    console.error('[DASHBOARD ERROR]:', err.message);
    if (err.message && (err.message.includes('401') || err.message.includes('session') || err.message.includes('Unauthorized') || err.message.includes('not found'))) {
      clearAuthSession();
      renderDashboardShell();
      return;
    }
    root.innerHTML = `<div class="empty-state">Unable to load dashboard details: ${escapeHtml(err.message)}</div>`;
  }
}

function renderSquadsTab(teams, submissions) {
  if (!teams || !teams.length) {
    return `
      <div class="empty-state">
        <p style="margin-bottom: 12px;">You haven't registered or joined an innovation squad yet.</p>
        <button type="button" class="primary-btn small" onclick="document.getElementById('hackathons').scrollIntoView({behavior:'smooth'})">
          Browse Hackathons to Register a Squad
        </button>
      </div>
    `;
  }

  return teams
    .map((team) => {
      const teamSubs = (submissions || []).filter((s) => s.team_id === team.id);
      return `
        <div class="squad-card">
          <div class="squad-header">
            <div>
              <span class="category-badge">${team.hackathon_name || 'Green Hackathon'}</span>
              <h3 style="font-size: 1.35rem; margin-top: 6px;">${team.name}</h3>
              <p class="body-sm" style="color: var(--colors-muted); margin-top: 2px;">
                <strong>Challenge Tackled:</strong> ${team.challenge_title || 'Open Sustainability Track'}
              </p>
            </div>
            <span class="status-badge open">Active Squad</span>
          </div>

          <div style="background: var(--colors-surface-card); padding: 12px 16px; border-radius: var(--rounded-md); margin-bottom: 16px;">
            <strong style="display: block; font-size: 0.8125rem; text-transform: uppercase; color: var(--colors-muted); margin-bottom: 6px;">Squad Roster</strong>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${(team.members || [])
                .map(
                  (m) => `
                <span class="category-badge" style="background:#ffffff; color:var(--colors-ink);">
                  👤 ${m.name} (${m.role})
                </span>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Project Submissions & Jury Scoring -->
          <div>
            <strong style="display: block; font-size: 0.9375rem; color: var(--colors-ink); margin-bottom: 8px;">Prototype Submission & Evaluation</strong>
            ${
              teamSubs.length
                ? teamSubs
                    .map((sub) => {
                      const ev = (sub.evaluations || [])[0];
                      const totalScore = ev
                        ? ev.innovation +
                          ev.social_impact +
                          ev.technical_feasibility +
                          ev.scalability +
                          ev.sustainability +
                          ev.presentation
                        : null;

                      return `
                  <div style="border: 1px solid var(--colors-hairline); border-radius: var(--rounded-md); padding: 16px; background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                      <div>
                        <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--colors-ink);">${sub.project_name}</h4>
                        <p class="body-sm">${sub.proposed_solution || sub.description}</p>
                      </div>
                      <span class="status-badge ${totalScore ? 'open' : 'upcoming'}">
                        ${totalScore ? `Jury Score: ${totalScore}/100` : 'Under Jury Review'}
                      </span>
                    </div>

                    <div style="font-size: 0.8125rem; color: var(--colors-muted); margin-bottom: 12px;">
                      <strong>Tech Stack:</strong> ${sub.technology_used || 'IoT, Embedded Systems, Node.js'}
                    </div>

                    ${
                      ev
                        ? `
                      <div class="jury-score-box">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                          <strong style="color: var(--colors-ink); font-size: 0.875rem;">Verified Evaluation by ${ev.judge_name}</strong>
                          <span style="font-size: 0.75rem; color: #15803d; font-weight: 600;">✓ Shortlisted for ₹5,00,000 Grant</span>
                        </div>
                        <p style="font-size: 0.8125rem; font-style: italic; color: var(--colors-body); margin-top: 6px;">"${ev.comments}"</p>

                        <div class="score-radar-grid">
                          <div class="score-item">
                            <strong>${ev.innovation}/20</strong>
                            <span>Innovation</span>
                          </div>
                          <div class="score-item">
                            <strong>${ev.social_impact}/25</strong>
                            <span>Social Impact</span>
                          </div>
                          <div class="score-item">
                            <strong>${ev.technical_feasibility}/20</strong>
                            <span>Feasibility</span>
                          </div>
                          <div class="score-item">
                            <strong>${ev.scalability}/15</strong>
                            <span>Scalability</span>
                          </div>
                          <div class="score-item">
                            <strong>${ev.sustainability}/10</strong>
                            <span>Sustainability</span>
                          </div>
                        </div>
                      </div>
                    `
                        : ''
                    }

                    <div style="display: flex; gap: 12px; margin-top: 14px; flex-wrap: wrap;">
                      ${sub.github_url ? `<a href="${sub.github_url}" target="_blank" rel="noopener" class="button-secondary small" style="display:inline-flex; align-items:center; gap:4px; padding:6px 12px; font-size:0.75rem; border-radius:6px;">🐙 GitHub Repo</a>` : ''}
                      ${sub.demo_url ? `<a href="${sub.demo_url}" target="_blank" rel="noopener" class="primary-btn small" style="padding:6px 12px; font-size:0.75rem; border-radius:6px;">⚡ Live Prototype Demo</a>` : ''}
                    </div>
                  </div>
                `;
                    })
                    .join('')
                : `
              <p class="body-sm" style="color: var(--colors-muted);">No prototype submitted yet. Submissions open during the hackathon sprint.</p>
            `
            }
          </div>
        </div>
      `;
    })
    .join('');
}

function renderRegisteredHackathonsTab(registrations) {
  if (!registrations || !registrations.length) {
    return '<div class="empty-state">You have not registered for any hackathons yet.</div>';
  }

  return `
    <div class="card-grid" style="margin-top: 12px;">
      ${registrations
        .map(
          (reg) => `
        <div class="clay-card">
          <div class="card-top">
            <div class="card-meta-row">
              <span class="category-badge">${reg.theme}</span>
              <span class="status-badge open">${reg.status}</span>
            </div>
            <h3>${reg.hackathon_name}</h3>
            <div class="card-details-list" style="margin-top: 12px;">
              <div><span>Mode:</span><strong>${reg.mode}</strong></div>
              <div><span>Location:</span><strong>${reg.location}</strong></div>
              <div><span>Sprint Dates:</span><strong>${reg.start_date} to ${reg.end_date}</strong></div>
            </div>
          </div>
          <div class="card-footer">
            <span class="body-sm" style="color: #15803d; font-weight: 600;">✓ Pass Confirmed</span>
            <span class="body-sm" style="font-size: 0.75rem;">Registered on ${new Date(reg.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderReportedProblemsTab(problems) {
  if (!problems || !problems.length) {
    return `
      <div class="empty-state">
        <p style="margin-bottom: 12px;">You haven't reported any environmental issues yet.</p>
        <button type="button" class="primary-btn small" onclick="document.getElementById('problemSection').scrollIntoView({behavior:'smooth'})">
          Report a Local Ecological Issue
        </button>
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 12px;">
      ${problems
        .map(
          (p) => `
        <div style="background: #ffffff; border: 1px solid var(--colors-hairline); border-radius: var(--rounded-md); padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                <span class="category-badge">${p.category}</span>
                <span class="status-badge ${p.status.toLowerCase()}">${p.status}</span>
                <span class="status-badge ${p.urgency.toLowerCase()}">${p.urgency} Urgency</span>
              </div>
              <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--colors-ink);">${escapeHtml(p.title)}</h4>
              <p class="body-sm" style="margin-top: 4px;">${escapeHtml(p.description)}</p>
              <div style="font-size: 0.8125rem; color: var(--colors-muted); margin-top: 8px;">
                📍 ${p.location ? escapeHtml(p.location) + ', ' : ''}${escapeHtml(p.city || 'India')} • 👥 ${(p.people_affected || 0).toLocaleString()} citizens affected
              </div>
              ${
                p.image_url
                  ? `
                <div style="margin-top: 10px; display: flex; align-items: center; gap: 12px; background: var(--colors-canvas); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--colors-hairline);">
                  <img src="${p.image_url}" alt="Evidence" style="width: 80px; height: 56px; object-fit: cover; border-radius: 6px; border: 1px solid var(--colors-hairline);" />
                  <div>
                    <strong style="display: block; font-size: 0.8125rem; color: var(--colors-ink);">📸 Photographic Ground Proof Attached</strong>
                    <a href="${p.image_url}" target="_blank" rel="noopener" style="font-size: 0.75rem; color: #2563eb; text-decoration: underline;">View Full Resolution</a>
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          </div>
          ${
            p.feedback
              ? `
            <div style="background: var(--colors-surface-soft); padding: 8px 12px; border-radius: 6px; margin-top: 10px; font-size: 0.8125rem; color: var(--colors-body);">
              <strong>Municipal Review Note:</strong> ${escapeHtml(p.feedback)}
            </div>
          `
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderNotificationsTab(notifications) {
  if (!notifications || !notifications.length) {
    return '<div class="empty-state">No notifications right now. All caught up!</div>';
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
      ${notifications
        .map(
          (n) => `
        <div style="background: ${n.read_flag ? '#ffffff' : 'var(--colors-surface-card)'}; border: 1px solid var(--colors-hairline); border-radius: var(--rounded-md); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.25rem;">${n.read_flag ? '✉️' : '🔔'}</span>
            <span style="font-size: 0.875rem; color: var(--colors-ink); font-weight: ${n.read_flag ? '400' : '600'};">${n.message}</span>
          </div>
          ${
            !n.read_flag
              ? `
            <button type="button" class="button-secondary small mark-read-btn" data-notif-id="${n.id}" style="padding: 4px 10px; min-height: auto; font-size: 0.75rem;">
              Mark Read
            </button>
          `
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// ==========================================================================
// DATA LOADERS & CARD RENDERING (HACKATHONS & CHALLENGES)
// ==========================================================================

async function loadStats() {
  try {
    const data = await apiRequest('/api/dashboard/stats');
    const statMap = {
      statUsers: data.totalUsers,
      statHackathons: data.totalHackathons,
      statProblems: data.totalProblems,
      statTeams: data.totalTeams,
      statImpact: (data.totalImpact || 0).toLocaleString(),
    };

    Object.entries(statMap).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });
  } catch (error) {
    console.warn('Dashboard stats unavailable:', error.message);
  }
}

async function loadHackathons() {
  const listEl = document.getElementById('hackathonList');
  if (!listEl) return;

  try {
    const hackathons = await apiRequest('/api/hackathons');
    appState.cachedHackathons = hackathons || [];

    if (!appState.cachedHackathons.length) {
      listEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No hackathons currently scheduled. Check back soon!</div>';
      return;
    }

    // Deduplicate by name
    const uniqueMap = new Map();
    appState.cachedHackathons.forEach((h) => {
      if (!uniqueMap.has(h.name)) uniqueMap.set(h.name, h);
    });
    const distinctHackathons = Array.from(uniqueMap.values());

    listEl.innerHTML = distinctHackathons
      .map((h) => {
        const statusClass = (h.status || '').toLowerCase().includes('open') ? 'open' : 'upcoming';
        return `
        <article class="clay-card">
          <div class="card-top">
            <div class="card-meta-row">
              <span class="category-badge">${h.theme || 'Sustainability'}</span>
              <span class="status-badge ${statusClass}">${h.status || 'Upcoming'}</span>
            </div>
            <h3>${h.name}</h3>
            <p class="card-desc">${h.description}</p>
            <div class="card-details-list">
              <div><span>Mode:</span><strong>${h.mode || 'Hybrid'}</strong></div>
              <div><span>Location:</span><strong>${h.location || 'Online'}</strong></div>
              <div><span>Sprint Dates:</span><strong>${h.start_date || 'TBD'} to ${h.end_date || 'TBD'}</strong></div>
              <div><span>Team Size:</span><strong>${h.team_size_min || 2}–${h.team_size_max || 5} Innovators</strong></div>
            </div>
          </div>
          <div class="card-footer">
            <button class="primary-btn small open-squad-modal-btn" data-hackathon-id="${h.id}" type="button">
              Register Squad
            </button>
            <span class="body-sm" style="font-size: 0.75rem;">Deadline: ${h.registration_deadline || 'Open'}</span>
          </div>
        </article>
      `;
      })
      .join('');

    // Wire squad registration modal launcher
    listEl.querySelectorAll('.open-squad-modal-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.hackathonId);
        openSquadRegisterModal(id);
      });
    });
  } catch (error) {
    console.warn('Failed to load hackathons:', error.message);
    listEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Unable to load hackathons.</div>';
  }
}

async function loadChallenges() {
  const listEl = document.getElementById('challengeList');
  if (!listEl) return;

  try {
    const problems = await apiRequest('/api/problems');
    appState.cachedProblems = problems || [];
    const approved = appState.cachedProblems.filter((p) => p.status === 'Approved');
    const pool = approved.length ? approved : appState.cachedProblems;

    // Deduplicate by title
    const uniqueMap = new Map();
    pool.forEach((p) => {
      if (!uniqueMap.has(p.title)) uniqueMap.set(p.title, p);
    });
    const distinctChallenges = Array.from(uniqueMap.values()).slice(0, 6);

    if (!distinctChallenges.length) {
      listEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No active community challenges yet. Report the first one below!</div>';
      return;
    }

    listEl.innerHTML = distinctChallenges
      .map((p) => {
        const urgencyClass = (p.urgency || '').toLowerCase();
        return `
        <article class="clay-card">
          ${
            p.image_url
              ? `
            <div class="challenge-card-img-wrap">
              <img src="${p.image_url}" alt="${escapeHtml(p.title)}" loading="lazy" />
              <span class="evidence-badge">📸 Photo Evidence</span>
            </div>
          `
              : ''
          }
          <div class="card-top">
            <div class="card-meta-row">
              <span class="category-badge">${escapeHtml(p.category)}</span>
              <span class="status-badge ${urgencyClass}">${escapeHtml(p.urgency)} Urgency</span>
            </div>
            <h3>${escapeHtml(p.title)}</h3>
            <p class="card-desc">${escapeHtml(p.description)}</p>
            <div class="card-details-list">
              <div><span>Location:</span><strong>${escapeHtml(p.city || 'N/A')}${p.location ? ' (' + escapeHtml(p.location) + ')' : ''}</strong></div>
              <div><span>Affected Citizens:</span><strong>${(p.people_affected || 0).toLocaleString()} people</strong></div>
              <div><span>Verification:</span><strong style="color: #15803d;">✓ Field Confirmed</strong></div>
            </div>
          </div>
          <div class="card-footer">
            <button class="secondary-btn small open-brief-btn" data-challenge-id="${p.id}" type="button">
              Inspect Brief & Solve
            </button>
            <span class="body-sm" style="font-size: 0.75rem;">Logged by Civic Validator</span>
          </div>
        </article>
      `;
      })
      .join('');

    // Wire challenge brief modal
    listEl.querySelectorAll('.open-brief-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.challengeId);
        const prob = appState.cachedProblems.find((p) => p.id === id);
        if (prob) openChallengeDetailModal(prob);
      });
    });
  } catch (error) {
    console.warn('Failed to load challenges:', error.message);
    listEl.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Unable to load challenges.</div>';
  }
}

// ==========================================================================
// MODAL DIALOG CONTROLLERS (SQUAD REGISTRATION & CHALLENGE BRIEFS)
// ==========================================================================

function openSquadRegisterModal(hackathonId, preselectedChallengeId = null) {
  if (!appState.currentUser) {
    showToast('Please sign in first to register an innovation squad.', 'warning');
    openModal('loginModal');
    return;
  }

  const hackathon = appState.cachedHackathons.find((h) => h.id === hackathonId) || appState.cachedHackathons[0];
  const modal = document.getElementById('teamRegisterModal');
  if (!modal) return;

  document.getElementById('regHackathonId').value = hackathonId;
  const titleEl = document.getElementById('teamModalTitle');
  const subEl = document.getElementById('teamModalSubtitle');
  if (titleEl) titleEl.textContent = `Register Squad for ${hackathon ? hackathon.name : 'Hackathon'}`;
  if (subEl) subEl.textContent = `Mode: ${hackathon ? hackathon.mode : 'Hybrid'} • Location: ${hackathon ? hackathon.location : 'Online'}`;

  // Populate challenges dropdown
  const select = document.getElementById('regTeamChallenge');
  if (select) {
    select.innerHTML = '<option value="" disabled selected>Select an approved environmental problem to solve</option>';
    const approved = appState.cachedProblems.filter((p) => p.status === 'Approved');
    const pool = approved.length ? approved : appState.cachedProblems;
    pool.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `[${p.category}] ${p.title} (${p.city})`;
      if (preselectedChallengeId && p.id === preselectedChallengeId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  }

  setFormBanner('teamRegisterMessage', '');
  clearFormErrors('teamRegisterForm');
  openModal('teamRegisterModal');
  document.getElementById('regTeamName')?.focus();
}

function openChallengeDetailModal(problem) {
  appState.selectedChallengeForSquad = problem;
  const modal = document.getElementById('challengeDetailModal');
  if (!modal) return;

  document.getElementById('modalChallengeCategory').textContent = problem.category;
  const urgencyEl = document.getElementById('modalChallengeUrgency');
  urgencyEl.textContent = `${problem.urgency} Urgency`;
  urgencyEl.className = `status-badge ${problem.urgency.toLowerCase()}`;

  document.getElementById('challengeModalTitle').textContent = problem.title;
  document.getElementById('modalChallengeLocation').textContent = `${problem.city || 'India'} ${problem.location ? '• ' + problem.location : ''}`;
  document.getElementById('modalChallengeAffected').textContent = `${(problem.people_affected || 0).toLocaleString()} residents affected in this catchment area`;
  document.getElementById('modalChallengeDesc').textContent = problem.description;
  document.getElementById('modalChallengeFeedback').textContent = problem.feedback || 'Field verified by civic environmental validators and mapped to active hackathon tracks.';

  const evidenceWrap = document.getElementById('modalEvidenceWrap');
  const imgEl = document.getElementById('modalChallengeImg');
  if (evidenceWrap && imgEl) {
    if (problem.image_url) {
      imgEl.src = problem.image_url;
      evidenceWrap.classList.remove('hidden');
    } else {
      evidenceWrap.classList.add('hidden');
    }
  }

  openModal('challengeDetailModal');
}

async function handleSquadRegisterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormBanner('teamRegisterMessage', '');

  const teamNameInput = document.getElementById('regTeamName');
  const challengeSelect = document.getElementById('regTeamChallenge');
  const hackathonId = Number(document.getElementById('regHackathonId').value);
  const teamDesc = document.getElementById('regTeamDesc').value.trim();

  const nameVal = teamNameInput.value.trim();
  if (!nameVal || nameVal.length < 2) {
    setFieldError('regTeamName', 'regTeamNameError', 'Squad name must be at least 2 characters long.');
    return;
  }
  setFieldError('regTeamName', 'regTeamNameError', '');

  if (!challengeSelect.value) {
    setFieldError('regTeamChallenge', 'regTeamChallengeError', 'Please select a challenge to solve.');
    return;
  }
  setFieldError('regTeamChallenge', 'regTeamChallengeError', '');

  const submitBtn = document.getElementById('teamSubmitBtn');
  setButtonLoading(submitBtn, true, 'Registering Squad...', 'Confirm Squad Registration');

  try {
    const res = await apiRequest(`/api/hackathons/${hackathonId}/squad-register`, {
      method: 'POST',
      body: JSON.stringify({
        team_name: nameVal,
        challenge_id: Number(challengeSelect.value),
        description: teamDesc,
      }),
    });

    form.reset();
    closeModal('teamRegisterModal');
    showToast(res.message || 'Squad registered successfully!', 'success');
    await loadStats();
    await renderDashboardShell();
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    setFormBanner('teamRegisterMessage', err.message || 'Failed to register squad.', 'error');
  } finally {
    setButtonLoading(submitBtn, false, 'Registering Squad...', 'Confirm Squad Registration');
  }
}

// ==========================================================================
// ADMIN DASHBOARD & REPORTS TABLE
// ==========================================================================

function renderReportsTable(reports) {
  const tbody = document.getElementById('adminReportTableBody');
  if (!tbody) return;

  if (!reports.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No matching reports found.</div></td></tr>';
    return;
  }

  tbody.innerHTML = reports
    .map(
      (report) => `
    <tr>
      <td>
        <strong>${escapeHtml(report.title)}</strong><br>
        <small>${escapeHtml(report.description)}</small>
        ${
          report.image_url
            ? `
          <div style="margin-top: 6px;">
            <a href="${report.image_url}" target="_blank" rel="noopener" style="font-size: 0.75rem; color: #2563eb; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;">
              📸 View Photo Evidence
            </a>
          </div>
        `
            : ''
        }
      </td>
      <td>${report.category}</td>
      <td>${report.city || 'N/A'}</td>
      <td><span class="status-badge ${report.urgency.toLowerCase()}">${report.urgency}</span></td>
      <td><span class="status-pill ${report.status.toLowerCase()}">${report.status}</span></td>
      <td>${new Date(report.created_at).toLocaleDateString()}</td>
      <td>
        <div class="table-actions">
          <button class="action-btn approve" data-report-id="${report.id}" data-status="Approved">Approve</button>
          <button class="action-btn reject" data-report-id="${report.id}" data-status="Rejected">Reject</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  document.querySelectorAll('[data-report-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.reportId);
      const status = button.dataset.status;
      const feedback = status === 'Approved' ? 'Verified by municipal review panel.' : 'Rejected after inspection.';

      try {
        await apiRequest(`/api/admin/reports/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ status, feedback }),
        });
        showToast(`Report marked as ${status}.`);
        loadAdminReports();
        loadChallenges();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
}

function renderAdminSummary(summary) {
  const root = document.getElementById('adminSummary');
  if (!root) return;

  if (!summary) {
    root.innerHTML = '<div class="empty-state">Admin summary is unavailable.</div>';
    return;
  }

  const cards = [
    { label: 'Total Reports', value: summary.totalReports },
    { label: 'Pending Review', value: summary.pending },
    { label: 'Approved Challenges', value: summary.approved },
    { label: 'Rejected', value: summary.rejected },
    { label: 'High Priority', value: summary.highPriority },
    { label: 'Citizens Impacted', value: (summary.peopleAffected || 0).toLocaleString() },
  ];

  root.innerHTML = cards
    .map(
      (card) => `
    <div class="kpi-box">
      <strong>${card.value}</strong>
      <span>${card.label}</span>
    </div>
  `
    )
    .join('');
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

  const exportBtn = document.getElementById('exportCsvBtn');
  setButtonLoading(exportBtn, true, 'Exporting CSV...', 'Export CSV');

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

  try {
    const response = await fetch(`/api/admin/reports/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${appState.token}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to export reports CSV.');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `socialhub-community-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    showToast('Community reports CSV exported successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setButtonLoading(exportBtn, false, 'Exporting CSV...', 'Export CSV');
  }
}

// ==========================================================================
// VALIDATION HELPERS & FORM HANDLING
// ==========================================================================

function updatePasswordMeter(password) {
  const fill = document.getElementById('meterBarFill');
  const label = document.getElementById('meterLabelText');
  if (!fill || !label) return;

  if (!password) {
    fill.style.width = '0%';
    fill.style.backgroundColor = 'var(--colors-hairline)';
    label.textContent = 'Enter password';
    label.style.color = 'var(--colors-muted)';
    return;
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    fill.style.width = '33%';
    fill.style.backgroundColor = 'var(--colors-error)';
    label.textContent = 'Weak';
    label.style.color = 'var(--colors-error)';
  } else if (score <= 4) {
    fill.style.width = '66%';
    fill.style.backgroundColor = 'var(--colors-warning)';
    label.textContent = 'Medium';
    label.style.color = 'var(--colors-warning)';
  } else {
    fill.style.width = '100%';
    fill.style.backgroundColor = 'var(--colors-success)';
    label.textContent = 'Strong';
    label.style.color = 'var(--colors-success)';
  }
}

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
  const val = input.value;
  if (!val) {
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
    if (showError) setFieldError('regName', 'regNameError', 'Full name must be between 2 and 60 characters.');
    return false;
  }
  setFieldError('regName', 'regNameError', '');
  return true;
}

function validateRegPhone(showError = true) {
  const input = document.getElementById('regPhone');
  if (!input) return true;
  const val = input.value.trim();
  if (val && !/^[+0-9\s-]{7,20}$/.test(val)) {
    if (showError) setFieldError('regPhone', 'regPhoneError', 'Enter a valid phone number or leave blank.');
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

async function quickLogin(email, password, displayName) {
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveSession(data.user, data.token);
    closeModal('loginModal');
    updateAuthButtons();
    await renderDashboardShell();
    if (isAdmin()) loadAdminReports();
    showToast(`Welcome back, ${displayName}!`, 'success');
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormBanner('loginMessage', '');

  const isEmailValid = validateLoginEmail(true);
  const isPassValid = validateLoginPassword(true);
  if (!isEmailValid || !isPassValid) return;

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
    await renderDashboardShell();
    if (isAdmin()) loadAdminReports();
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
    closeModal('loginModal');
    updateAuthButtons();
    await renderDashboardShell();
    loadAdminReports();
    showToast('Signed in as Demo Administrator.', 'success');
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
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
    closeModal('loginModal');
    updateAuthButtons();
    await renderDashboardShell();
    showToast('Signed in as Demo Citizen (Ravi Kumar).', 'success');
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
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

  const v1 = validateRegName(true);
  const v2 = validateRegPhone(true);
  const v3 = validateRegEmail(true);
  const v4 = validateRegRole(true);
  const v5 = validateRegPassword(true);
  const v6 = validateRegConfirmPassword(true);

  if (!v1 || !v2 || !v3 || !v4 || !v5 || !v6) return;

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
    closeModal('registerModal');
    updateAuthButtons();
    await renderDashboardShell();
    showToast(`Welcome to Social Innovators Hub, ${data.user.name}!`, 'success');
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    setFormBanner('registerMessage', error.message || 'Registration failed.', 'error');
  } finally {
    setButtonLoading(submitBtn, false, 'Creating Account...', 'Create Account');
  }
}

async function handleLogout() {
  try {
    if (appState.token) {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    }
  } catch (error) {
    console.warn('[LOGOUT]:', error.message);
  } finally {
    clearSession();
    updateAuthButtons();
    await renderDashboardShell();
    const tbody = document.getElementById('adminReportTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Admin reports are hidden until you sign in as admin.</div></td></tr>';
    }
    showToast('Logged out successfully.');
  }
}

function initPhotoDropzone() {
  const dropzone = document.getElementById('photoDropzone');
  const fileInput = document.getElementById('problemFileInput');
  const previewCard = document.getElementById('photoPreviewCard');
  const previewImg = document.getElementById('photoPreviewImg');
  const previewName = document.getElementById('photoPreviewName');
  const previewDim = document.getElementById('photoPreviewDimensions');
  const changeBtn = document.getElementById('changePhotoBtn');
  const removeBtn = document.getElementById('removePhotoBtn');
  const hiddenData = document.getElementById('problemImageData');
  const hiddenUrl = document.getElementById('problemImageUrl');
  const sampleChips = document.querySelectorAll('.sample-chip');
  const presetChips = document.querySelectorAll('.preset-chip');
  const impactInput = document.getElementById('probPeopleAffected');
  const descInput = document.getElementById('probDescription');
  const charCounter = document.getElementById('descCharCount');

  function showPreview(src, name, info) {
    if (!previewCard || !dropzone || !previewImg) return;
    previewImg.src = src;
    if (previewName) previewName.textContent = name || 'ground-evidence.jpg';
    if (previewDim) previewDim.textContent = info || 'Verified Photographic Evidence Attached';
    previewCard.classList.remove('hidden');
    dropzone.classList.add('hidden');
  }

  function resetPhoto() {
    if (fileInput) fileInput.value = '';
    if (hiddenData) hiddenData.value = '';
    if (hiddenUrl) hiddenUrl.value = '';
    if (previewImg) previewImg.src = '';
    if (previewCard) previewCard.classList.add('hidden');
    if (dropzone) dropzone.classList.remove('hidden');
    sampleChips.forEach((chip) => chip.classList.remove('active'));
  }

  function handleFile(file) {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Unsupported file type. Please upload a JPG, PNG, or WEBP image.', 'error');
      return;
    }
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      showToast('Image size exceeds 5MB limit. Please upload a smaller photo.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (hiddenData) hiddenData.value = dataUrl;
      if (hiddenUrl) hiddenUrl.value = ''; // Custom file upload takes precedence
      sampleChips.forEach((chip) => chip.classList.remove('active'));

      const sizeKb = (file.size / 1024).toFixed(1);
      showPreview(dataUrl, file.name, `${file.type.split('/')[1].toUpperCase()} • ${sizeKb} KB • Ready for upload`);
      showToast('Ground photo evidence attached!', 'success');
    };
    reader.onerror = () => {
      showToast('Error reading image file.', 'error');
    };
    reader.readAsDataURL(file);
  }

  // Click & drag-and-drop on dropzone
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt && dt.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });
  }

  if (changeBtn && fileInput) {
    changeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetPhoto();
      showToast('Photo evidence removed.');
    });
  }

  // Sample quick test chips
  sampleChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      sampleChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      const src = chip.dataset.src;
      const name = chip.dataset.name || 'sample-evidence.jpg';
      if (hiddenUrl) hiddenUrl.value = src;
      if (hiddenData) hiddenData.value = '';
      if (fileInput) fileInput.value = '';

      showPreview(src, name, 'Verified Ground Evidence Asset');
      showToast(`Attached sample photo: ${chip.textContent.trim()}`, 'success');
    });
  });

  // Population preset chips
  presetChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      presetChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      if (impactInput) {
        impactInput.value = chip.dataset.impact;
      }
    });
  });

  // Description character counter
  if (descInput && charCounter) {
    const updateCount = () => {
      const len = descInput.value.trim().length;
      charCounter.textContent = `${len} / 20 min`;
      if (len >= 20) {
        charCounter.style.color = '#15803d';
      } else {
        charCounter.style.color = 'var(--colors-muted)';
      }
    };
    descInput.addEventListener('input', updateCount);
    updateCount();
  }

  return { resetPhoto };
}

async function handleProblemSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setFormBanner('problemMessage', '');

  if (!appState.currentUser) {
    setFormBanner('problemMessage', 'Please sign in as a citizen or innovator to report an ecological breakdown.', 'error');
    showToast('Please sign in to submit a problem report.', 'warning');
    openModal('loginModal');
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  const title = (payload.title || '').trim();
  const category = (payload.category || '').trim();
  const city = (payload.city || '').trim();
  const description = (payload.description || '').trim();

  if (title.length < 5) {
    setFormBanner('problemMessage', 'Problem title must be at least 5 characters.', 'error');
    document.getElementById('probTitle')?.focus();
    return;
  }
  if (!category) {
    setFormBanner('problemMessage', 'Please select an environmental domain / category.', 'error');
    document.getElementById('probCategory')?.focus();
    return;
  }
  if (!city) {
    setFormBanner('problemMessage', 'Please specify the city / district.', 'error');
    document.getElementById('probCity')?.focus();
    return;
  }
  if (description.length < 20) {
    setFormBanner('problemMessage', 'Description must be at least 20 characters to provide sufficient field context for engineering teams.', 'error');
    document.getElementById('probDescription')?.focus();
    return;
  }

  const submitBtn = document.getElementById('submitProblemBtn');
  setButtonLoading(submitBtn, true, 'Submitting Report with Photographic Proof...', '🚀 Submit Problem Report with Photographic Proof');

  try {
    const res = await apiRequest('/api/problems', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    form.reset();
    if (window._photoDropzoneHandler) {
      window._photoDropzoneHandler.resetPhoto();
    }

    const hasPhoto = res.problem && res.problem.image_url;
    setFormBanner(
      'problemMessage',
      `✓ Problem report logged successfully (#${res.problem ? res.problem.id : ''})! ${hasPhoto ? '📸 Photographic proof attached.' : ''} Queued for municipal review & student hackathons.`,
      'success'
    );
    showToast(`Your ecological challenge has been submitted for validation ${hasPhoto ? 'with photographic proof' : ''}!`, 'success');

    await loadStats();
    await loadChallenges();
    await renderDashboardShell();
    if (isAdmin()) loadAdminReports();
  } catch (error) {
    setFormBanner('problemMessage', error.message || 'Failed to submit problem report.', 'error');
  } finally {
    setButtonLoading(submitBtn, false, 'Submitting Report with Photographic Proof...', '🚀 Submit Problem Report with Photographic Proof');
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
    setFormMessage('contactMessage', 'Your message has been sent successfully.', 'success');
    showToast('Thank you! Our community coordinator will respond shortly.', 'success');
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

  // Pre-footer & footer links
  document.getElementById('ctaRegisterBtn')?.addEventListener('click', () => {
    document.getElementById('hackathons')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('ctaProblemBtn')?.addEventListener('click', () => {
    document.getElementById('problemSection')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('footerSignInLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('loginModal');
  });
  document.getElementById('footerRegisterLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('registerModal');
  });

  // Modal Switchers
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

  // Form squad button inside challenge detail modal
  document.getElementById('modalFormSquadBtn')?.addEventListener('click', () => {
    closeModal('challengeDetailModal');
    if (!appState.currentUser) {
      showToast('Please sign in to form an innovation squad.', 'warning');
      openModal('loginModal');
      return;
    }
    const defaultHackathon = appState.cachedHackathons[0];
    const defaultHackId = defaultHackathon ? defaultHackathon.id : 1;
    const challengeId = appState.selectedChallengeForSquad ? appState.selectedChallengeForSquad.id : null;
    openSquadRegisterModal(defaultHackId, challengeId);
  });

  // Password toggles & meter
  initPasswordToggles();
  const regPassInput = document.getElementById('regPassword');
  if (regPassInput) {
    regPassInput.addEventListener('input', (e) => {
      updatePasswordMeter(e.target.value);
      if (e.target.value.length >= 8) validateRegPassword(false);
    });
    regPassInput.addEventListener('blur', () => validateRegPassword(true));
  }

  // Field validation listeners
  document.getElementById('loginEmail')?.addEventListener('blur', () => validateLoginEmail(true));
  document.getElementById('loginPassword')?.addEventListener('blur', () => validateLoginPassword(true));
  document.getElementById('regName')?.addEventListener('blur', () => validateRegName(true));
  document.getElementById('regPhone')?.addEventListener('blur', () => validateRegPhone(true));
  document.getElementById('regEmail')?.addEventListener('blur', () => validateRegEmail(true));
  document.getElementById('regRole')?.addEventListener('change', () => validateRegRole(true));
  document.getElementById('regConfirmPassword')?.addEventListener('blur', () => validateRegConfirmPassword(true));

  // Form submissions
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('teamRegisterForm')?.addEventListener('submit', handleSquadRegisterSubmit);
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
    if (event.target.classList.contains('modal')) {
      closeModal(event.target.id);
    }
  });

  // Keyboard Escape key
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach((modal) => closeModal(modal.id));
    }
  });
}

// Session restoration
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

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      clearSession();
    }
  } catch (networkError) {
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
  window._photoDropzoneHandler = initPhotoDropzone();
  await restoreSession();
  updateAuthButtons();
  await loadStats();
  await loadHackathons();
  await loadChallenges();
  await renderDashboardShell();

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