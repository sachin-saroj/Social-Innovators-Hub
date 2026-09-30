const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
require('dotenv').config();

const { db, initializeDatabase } = require('./database');

const app = express();
const PORT = Number(process.env.PORT || 3000);

initializeDatabase();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(express.static(__dirname));

const JWT_SECRET = process.env.JWT_SECRET || 'social-innovators-demo-secret';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || (req.user.role !== role && req.user.role !== 'Admin')) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    city: user.city || '',
    role: user.role,
    created_at: user.created_at,
  };
}

function usersSummary() {
  return db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN role = 'Student' THEN 1 ELSE 0 END) AS students,
      SUM(CASE WHEN role IN ('Community Member', 'Citizen') THEN 1 ELSE 0 END) AS community,
      SUM(CASE WHEN role = 'Mentor' THEN 1 ELSE 0 END) AS mentors,
      SUM(CASE WHEN role = 'Judge' THEN 1 ELSE 0 END) AS judges
    FROM users
  `).get();
}

function getUserById(id) {
  return db.prepare('SELECT id, name, email, phone, city, role, created_at FROM users WHERE id = ?').get(id);
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function getReportRows() {
  return db.prepare(`
    SELECT p.*, u.name AS submitted_by, u.email AS submitter_email
    FROM problems p
    LEFT JOIN users u ON u.id = p.created_by
    ORDER BY p.created_at DESC
  `).all();
}

function filterReportRows(rows, filters = {}) {
  return rows.filter((row) => {
    if (!row) return false;

    const search = (filters.search || '').trim().toLowerCase();
    if (search) {
      const haystack = [
        row.title,
        row.description,
        row.category,
        row.city,
        row.submitted_by,
        row.submitter_email,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (filters.category && filters.category !== 'All' && row.category !== filters.category) return false;
    if (filters.status && filters.status !== 'All' && row.status !== filters.status) return false;
    if (filters.urgency && filters.urgency !== 'All' && row.urgency !== filters.urgency) return false;
    if (filters.city && filters.city !== 'All' && row.city !== filters.city) return false;
    if (filters.date && filters.date !== 'All') {
      const dateOnly = (row.created_at || '').slice(0, 10);
      if (dateOnly !== filters.date) return false;
    }

    return true;
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Social Innovators Hub API is running.' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone, city, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password and role are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, city, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), email.trim().toLowerCase(), passwordHash, phone || '', city || '', role);

  const createdUser = db.prepare('SELECT id, name, email, phone, city, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(createdUser);

  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)')
    .run(createdUser.id, 'Welcome! Your account has been created successfully.');

  res.status(201).json({
    message: 'Registration successful.',
    token,
    user: createdUser,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const authUser = safeUser(user);
  const token = signToken(authUser);

  res.json({
    message: 'Login successful.',
    token,
    user: authUser,
  });
});

app.post('/api/auth/demo-admin', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@socialhub.com');
  if (!user) {
    return res.status(404).json({ message: 'Demo admin account not found.' });
  }

  if (user.role !== 'Admin') {
    return res.status(403).json({ message: 'Demo account is not registered as an admin.' });
  }

  const authUser = safeUser(user);
  const token = signToken(authUser);

  res.json({
    message: 'Demo admin login successful.',
    token,
    user: authUser,
  });
});

app.post('/api/auth/demo-citizen', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get('citizen@socialhub.com');
  if (!user) {
    return res.status(404).json({ message: 'Demo citizen account not found.' });
  }

  if (user.role !== 'Citizen') {
    return res.status(403).json({ message: 'Demo account is not registered as a citizen.' });
  }

  const authUser = safeUser(user);
  const token = signToken(authUser);

  res.json({
    message: 'Demo citizen login successful.',
    token,
    user: authUser,
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  res.json({ user: safeUser(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logout successful.' });
});

app.get('/api/problems', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, u.name AS created_by_name
    FROM problems p
    LEFT JOIN users u ON u.id = p.created_by
    ORDER BY p.created_at DESC
  `).all();

  res.json(rows);
});

app.post('/api/problems', requireAuth, (req, res) => {
  const { title, description, category, location, city, urgency, people_affected, image_url } = req.body;

  if (!title || !description || !category || !urgency) {
    return res.status(400).json({ message: 'Title, description, category and urgency are required.' });
  }

  const result = db.prepare(`
    INSERT INTO problems (title, description, category, location, city, urgency, people_affected, image_url, created_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
  `).run(title.trim(), description.trim(), category, location || '', city || '', urgency, Number(people_affected || 0), image_url || '', req.user.id);

  const problem = db.prepare(`
    SELECT p.*, u.name AS created_by_name
    FROM problems p
    LEFT JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)')
    .run(req.user.id, `Your problem "${title}" has been submitted for verification.`);

  res.status(201).json({ message: 'Problem submitted successfully.', problem });
});

app.put('/api/problems/:id', requireAuth, (req, res) => {
  const { status, feedback } = req.body;
  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(Number(req.params.id));

  if (!problem) {
    return res.status(404).json({ message: 'Problem not found.' });
  }

  if (req.user.role !== 'Admin' && req.user.id !== problem.created_by) {
    return res.status(403).json({ message: 'You are not allowed to update this problem.' });
  }

  db.prepare(`
    UPDATE problems
    SET status = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status || problem.status, feedback || problem.feedback || '', Number(req.params.id));

  if (status === 'Approved') {
    db.prepare('INSERT OR IGNORE INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)')
      .run(problem.created_by, `Your problem "${problem.title}" has been approved and published as a challenge.`);
  }

  if (status === 'Rejected') {
    db.prepare('INSERT OR IGNORE INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)')
      .run(problem.created_by, `Your problem "${problem.title}" was rejected. Feedback: ${feedback || 'Not provided'}`);
  }

  const updated = db.prepare('SELECT * FROM problems WHERE id = ?').get(Number(req.params.id));
  res.json({ message: 'Problem updated successfully.', problem: updated });
});

app.delete('/api/problems/:id', requireAuth, requireRole('Admin'), (req, res) => {
  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(Number(req.params.id));
  if (!problem) {
    return res.status(404).json({ message: 'Problem not found.' });
  }

  db.prepare('DELETE FROM problems WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Problem deleted successfully.' });
});

app.get('/api/hackathons', (req, res) => {
  const rows = db.prepare('SELECT * FROM hackathons ORDER BY start_date DESC').all();
  res.json(rows);
});

app.post('/api/hackathons', requireAuth, requireRole('Admin'), (req, res) => {
  const { name, description, theme, start_date, end_date, registration_deadline, team_size_min, team_size_max, location, mode, status } = req.body;

  if (!name || !description) {
    return res.status(400).json({ message: 'Hackathon name and description are required.' });
  }

  const result = db.prepare(`
    INSERT INTO hackathons (name, description, theme, start_date, end_date, registration_deadline, team_size_min, team_size_max, location, mode, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name.trim(), description.trim(), theme || '', start_date || '', end_date || '', registration_deadline || '', Number(team_size_min || 2), Number(team_size_max || 5), location || '', mode || 'Hybrid', status || 'Upcoming');

  const hackathon = db.prepare('SELECT * FROM hackathons WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Hackathon created successfully.', hackathon });
});

app.post('/api/hackathons/:id/register', requireAuth, (req, res) => {
  const userId = req.user.id;
  const hackathonId = Number(req.params.id);

  const existing = db.prepare('SELECT * FROM hackathon_registrations WHERE user_id = ? AND hackathon_id = ?').get(userId, hackathonId);
  if (existing) {
    return res.status(409).json({ message: 'You are already registered for this hackathon.' });
  }

  const hackathon = db.prepare('SELECT * FROM hackathons WHERE id = ?').get(hackathonId);
  if (!hackathon) {
    return res.status(404).json({ message: 'Hackathon not found.' });
  }

  db.prepare('INSERT INTO hackathon_registrations (user_id, hackathon_id, status) VALUES (?, ?, ?)').run(userId, hackathonId, 'Registered');
  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)').run(userId, `You registered for ${hackathon.name}.`);

  res.status(201).json({ message: 'Registered successfully.' });
});

app.get('/api/teams', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, u.name AS leader_name, h.name AS hackathon_name, p.title AS challenge_title
    FROM teams t
    LEFT JOIN users u ON u.id = t.team_leader_id
    LEFT JOIN hackathons h ON h.id = t.hackathon_id
    LEFT JOIN problems p ON p.id = t.challenge_id
    ORDER BY t.created_at DESC
  `).all();

  res.json(rows);
});

app.post('/api/teams', requireAuth, (req, res) => {
  const { name, description, hackathon_id, challenge_id } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Team name is required.' });
  }

  const result = db.prepare(`
    INSERT INTO teams (name, description, hackathon_id, challenge_id, team_leader_id, status)
    VALUES (?, ?, ?, ?, ?, 'Active')
  `).run(name.trim(), description || '', Number(hackathon_id || 0) || null, Number(challenge_id || 0) || null, req.user.id);

  const teamId = result.lastInsertRowid;
  db.prepare('INSERT INTO team_members (team_id, user_id, role, status) VALUES (?, ?, ?, ?)')
    .run(teamId, req.user.id, 'Team Leader', 'Accepted');

  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)')
    .run(req.user.id, `Team "${name}" has been created successfully.`);

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  res.status(201).json({ message: 'Team created successfully.', team });
});

app.get('/api/submissions', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, t.name AS team_name, u.name AS submitted_by_name
    FROM submissions s
    LEFT JOIN teams t ON t.id = s.team_id
    LEFT JOIN users u ON u.id = s.submitted_by
    ORDER BY s.created_at DESC
  `).all();

  if (req.user.role !== 'Admin') {
    const memberTeamIds = db.prepare('SELECT team_id FROM team_members WHERE user_id = ?').all(req.user.id).map(member => member.team_id);
    const filtered = rows.filter(item => item.submitted_by === req.user.id || (item.team_id !== null && memberTeamIds.includes(item.team_id)));
    return res.json(filtered);
  }

  res.json(rows);
});

app.post('/api/submissions', requireAuth, (req, res) => {
  const { team_id, project_name, problem_statement, proposed_solution, description, innovation, technology_used, expected_social_impact, implementation_plan, sustainability_plan, github_url, demo_url, presentation_url } = req.body;

  if (!project_name || !description) {
    return res.status(400).json({ message: 'Project name and description are required.' });
  }

  const result = db.prepare(`
    INSERT INTO submissions (
      team_id, project_name, problem_statement, proposed_solution, description, innovation,
      technology_used, expected_social_impact, implementation_plan, sustainability_plan,
      github_url, demo_url, presentation_url, status, submitted_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)
  `).run(
    team_id || null,
    project_name.trim(),
    problem_statement || '',
    proposed_solution || '',
    description.trim(),
    innovation || '',
    technology_used || '',
    expected_social_impact || '',
    implementation_plan || '',
    sustainability_plan || '',
    github_url || '',
    demo_url || '',
    presentation_url || '',
    req.user.id
  );

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(result.lastInsertRowid);
  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)').run(req.user.id, `Project "${project_name}" was submitted successfully.`);

  res.status(201).json({ message: 'Project submitted successfully.', submission });
});

app.post('/api/evaluations', requireAuth, requireRole('Judge'), (req, res) => {
  const { submission_id, innovation, social_impact, technical_feasibility, scalability, sustainability, presentation, comments, recommendation } = req.body;

  if (!submission_id) {
    return res.status(400).json({ message: 'Submission ID is required.' });
  }

  const judge = db.prepare('SELECT id FROM judges WHERE user_id = ?').get(req.user.id);
  if (!judge) {
    return res.status(404).json({ message: 'Judge profile not found.' });
  }

  const existing = db.prepare('SELECT * FROM evaluations WHERE submission_id = ? AND judge_id = ?').get(Number(submission_id), judge.id);
  if (existing) {
    return res.status(409).json({ message: 'This submission has already been evaluated by you.' });
  }

  const fields = {
    innovation: Number(innovation || 0),
    social_impact: Number(social_impact || 0),
    technical_feasibility: Number(technical_feasibility || 0),
    scalability: Number(scalability || 0),
    sustainability: Number(sustainability || 0),
    presentation: Number(presentation || 0),
  };

  if (Object.values(fields).some(value => value < 0 || value > 100)) {
    return res.status(400).json({ message: 'Scores must be between 0 and 100.' });
  }

  const result = db.prepare(`
    INSERT INTO evaluations (
      submission_id, judge_id, innovation, social_impact, technical_feasibility, scalability, sustainability, presentation, comments, recommendation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(Number(submission_id), judge.id, fields.innovation, fields.social_impact, fields.technical_feasibility, fields.scalability, fields.sustainability, fields.presentation, comments || '', recommendation || '');

  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)')
    .run(req.user.id, 'Your evaluation has been submitted successfully.');

  const evaluation = db.prepare('SELECT * FROM evaluations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Evaluation recorded successfully.', evaluation });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read_flag = 1 WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ message: 'Notification marked as read.' });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email and message are required.' });
  }

  db.prepare('INSERT INTO contact_messages (name, email, subject, message, read_flag) VALUES (?, ?, ?, ?, 0)').run(name.trim(), email.trim(), subject || 'General Inquiry', message.trim());
  res.status(201).json({ message: 'Your message has been sent successfully.' });
});

app.get('/api/contact', requireAuth, requireRole('Admin'), (req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/api/impact', (req, res) => {
  const rows = db.prepare('SELECT * FROM impact_records ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/impact', requireAuth, (req, res) => {
  const { submission_id, project_name, implementation_status, people_benefited, problems_addressed, estimated_cost, actual_cost, resources_saved, time_saved, environmental_impact, community_feedback } = req.body;

  if (!submission_id || !project_name) {
    return res.status(400).json({ message: 'Submission ID and project name are required.' });
  }

  const result = db.prepare(`
    INSERT INTO impact_records (
      submission_id, project_name, implementation_status, people_benefited,
      problems_addressed, estimated_cost, actual_cost, resources_saved, time_saved,
      environmental_impact, community_feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(submission_id),
    project_name.trim(),
    implementation_status || 'Prototype',
    Number(people_benefited || 0),
    problems_addressed || '',
    estimated_cost || '',
    actual_cost || '',
    resources_saved || '',
    time_saved || '',
    environmental_impact || '',
    community_feedback || ''
  );

  const record = db.prepare('SELECT * FROM impact_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Impact record created successfully.', record });
});

app.get('/api/dashboard/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
  const totalHackathons = db.prepare('SELECT COUNT(*) AS total FROM hackathons').get().total;
  const totalProblems = db.prepare('SELECT COUNT(*) AS total FROM problems').get().total;
  const totalTeams = db.prepare('SELECT COUNT(*) AS total FROM teams').get().total;
  const totalSubmissions = db.prepare('SELECT COUNT(*) AS total FROM submissions').get().total;
  const totalImpact = db.prepare('SELECT COALESCE(SUM(people_benefited), 0) AS total FROM impact_records').get().total;

  res.json({
    totalUsers,
    totalHackathons,
    totalProblems,
    totalTeams,
    totalSubmissions,
    totalImpact,
    userStats: usersSummary(),
  });
});

app.get('/api/admin/dashboard', requireAuth, requireRole('Admin'), (req, res) => {
  const stats = {
    totalUsers: db.prepare('SELECT COUNT(*) AS total FROM users').get().total,
    totalProblems: db.prepare('SELECT COUNT(*) AS total FROM problems').get().total,
    pendingReports: db.prepare("SELECT COUNT(*) AS total FROM problems WHERE status = 'Pending'").get().total,
    approvedProblems: db.prepare("SELECT COUNT(*) AS total FROM problems WHERE status = 'Approved'").get().total,
    hackathons: db.prepare('SELECT COUNT(*) AS total FROM hackathons').get().total,
    teams: db.prepare('SELECT COUNT(*) AS total FROM teams').get().total,
    projects: db.prepare('SELECT COUNT(*) AS total FROM submissions').get().total,
    peopleBenefited: db.prepare('SELECT COALESCE(SUM(people_benefited), 0) AS total FROM impact_records').get().total,
  };

  res.json({ stats });
});

app.get('/api/admin/reports', requireAuth, requireRole('Admin'), (req, res) => {
  const allReports = getReportRows();
  const filters = {
    search: req.query.search || '',
    category: req.query.category || 'All',
    status: req.query.status || 'All',
    urgency: req.query.urgency || 'All',
    city: req.query.city || 'All',
    date: req.query.date || 'All',
  };

  const reports = filterReportRows(allReports, filters);
  const totalReports = allReports.length;
  const pending = allReports.filter(item => item.status === 'Pending').length;
  const approved = allReports.filter(item => item.status === 'Approved').length;
  const rejected = allReports.filter(item => item.status === 'Rejected').length;
  const highPriority = allReports.filter(item => item.urgency === 'High' || item.urgency === 'Critical').length;
  const peopleAffected = allReports.reduce((sum, item) => sum + Number(item.people_affected || 0), 0);

  res.json({
    reports,
    stats: {
      totalReports,
      pending,
      approved,
      rejected,
      highPriority,
      peopleAffected,
    },
  });
});

app.get('/api/admin/reports/export', requireAuth, requireRole('Admin'), (req, res) => {
  const rows = filterReportRows(getReportRows(), {
    search: req.query.search || '',
    category: req.query.category || 'All',
    status: req.query.status || 'All',
    urgency: req.query.urgency || 'All',
    city: req.query.city || 'All',
    date: req.query.date || 'All',
  });

  const headers = [
    'ID',
    'Problem Title',
    'Description',
    'Category',
    'Location',
    'City',
    'Urgency',
    'People Affected',
    'Submitted By',
    'Submitter Email',
    'Status',
    'Admin Feedback',
    'Submitted Date',
    'Updated Date',
  ];

  const csvRows = [headers.map(escapeCsv).join(',')];

  rows.forEach((row) => {
    csvRows.push([
      row.id,
      row.title,
      row.description,
      row.category,
      row.location,
      row.city,
      row.urgency,
      row.people_affected,
      row.submitted_by,
      row.submitter_email,
      row.status,
      row.feedback,
      row.created_at,
      row.updated_at,
    ].map(escapeCsv).join(','));
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="social-innovators-community-reports.csv"');
  res.status(200).send(csvRows.join('\n'));
});

app.put('/api/admin/reports/:id', requireAuth, requireRole('Admin'), (req, res) => {
  const id = Number(req.params.id);
  const { status, feedback } = req.body;
  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(id);

  if (!problem) {
    return res.status(404).json({ message: 'Problem not found.' });
  }

  const nextStatus = status || problem.status;
  if (!['Pending', 'Approved', 'Rejected'].includes(nextStatus)) {
    return res.status(400).json({ message: 'Invalid report status.' });
  }

  db.prepare(`
    UPDATE problems SET status = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(nextStatus, (feedback ?? problem.feedback ?? '').toString(), id);

  if (nextStatus === 'Approved') {
    db.prepare('INSERT INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)')
      .run(problem.created_by, `Your report "${problem.title}" has been approved and published.`);
  }

  if (nextStatus === 'Rejected') {
    db.prepare('INSERT INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)')
      .run(problem.created_by, `Your report "${problem.title}" was rejected. Reason: ${feedback || 'No reason provided.'}`);
  }

  const updated = db.prepare('SELECT p.*, u.name AS submitted_by, u.email AS submitter_email FROM problems p LEFT JOIN users u ON u.id = p.created_by WHERE p.id = ?').get(id);
  res.json({ message: 'Report updated successfully.', report: updated });
});

app.delete('/api/admin/reports/:id', requireAuth, requireRole('Admin'), (req, res) => {
  const id = Number(req.params.id);
  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(id);

  if (!problem) {
    return res.status(404).json({ message: 'Problem not found.' });
  }

  db.prepare('DELETE FROM problems WHERE id = ?').run(id);
  res.json({ message: 'Problem deleted successfully.' });
});

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`Social Innovators Hub server is running on http://localhost:${PORT}`);
});
