const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'socialhub.db'));
db.pragma('foreign_keys = ON');

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      role TEXT DEFAULT 'Student',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT,
      city TEXT,
      urgency TEXT NOT NULL,
      people_affected INTEGER DEFAULT 0,
      image_url TEXT,
      status TEXT DEFAULT 'Pending',
      feedback TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS hackathons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      theme TEXT,
      start_date TEXT,
      end_date TEXT,
      registration_deadline TEXT,
      team_size_min INTEGER DEFAULT 2,
      team_size_max INTEGER DEFAULT 5,
      location TEXT,
      mode TEXT DEFAULT 'Hybrid',
      status TEXT DEFAULT 'Upcoming',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS hackathon_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      hackathon_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Registered',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, hackathon_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(hackathon_id) REFERENCES hackathons(id)
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      hackathon_id INTEGER,
      challenge_id INTEGER,
      team_leader_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(hackathon_id) REFERENCES hackathons(id),
      FOREIGN KEY(challenge_id) REFERENCES problems(id),
      FOREIGN KEY(team_leader_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'Member',
      status TEXT DEFAULT 'Accepted',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id),
      FOREIGN KEY(team_id) REFERENCES teams(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS team_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      invitee_id INTEGER NOT NULL,
      invited_by INTEGER NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(team_id) REFERENCES teams(id),
      FOREIGN KEY(invitee_id) REFERENCES users(id),
      FOREIGN KEY(invited_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mentors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      expertise TEXT,
      bio TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(mentor_id, team_id),
      FOREIGN KEY(mentor_id) REFERENCES mentors(id),
      FOREIGN KEY(team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS mentor_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      mentor_id INTEGER NOT NULL,
      feedback TEXT NOT NULL,
      suggestions TEXT,
      priority TEXT DEFAULT 'Medium',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(team_id) REFERENCES teams(id),
      FOREIGN KEY(mentor_id) REFERENCES mentors(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      project_name TEXT NOT NULL,
      problem_statement TEXT,
      proposed_solution TEXT,
      description TEXT,
      innovation TEXT,
      technology_used TEXT,
      expected_social_impact TEXT,
      implementation_plan TEXT,
      sustainability_plan TEXT,
      github_url TEXT,
      demo_url TEXT,
      presentation_url TEXT,
      status TEXT DEFAULT 'Draft',
      submitted_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(team_id) REFERENCES teams(id),
      FOREIGN KEY(submitted_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS judges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      expertise TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      judge_id INTEGER NOT NULL,
      innovation INTEGER DEFAULT 0,
      social_impact INTEGER DEFAULT 0,
      technical_feasibility INTEGER DEFAULT 0,
      scalability INTEGER DEFAULT 0,
      sustainability INTEGER DEFAULT 0,
      presentation INTEGER DEFAULT 0,
      comments TEXT,
      recommendation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(submission_id, judge_id),
      FOREIGN KEY(submission_id) REFERENCES submissions(id),
      FOREIGN KEY(judge_id) REFERENCES judges(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      read_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      read_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS impact_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      project_name TEXT NOT NULL,
      implementation_status TEXT DEFAULT 'Prototype',
      people_benefited INTEGER DEFAULT 0,
      problems_addressed TEXT,
      estimated_cost TEXT,
      actual_cost TEXT,
      resources_saved TEXT,
      time_saved TEXT,
      environmental_impact TEXT,
      community_feedback TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(submission_id) REFERENCES submissions(id)
    );
  `);
}

function seedDemoData() {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const studentHash = bcrypt.hashSync('student123', 10);
  const communityHash = bcrypt.hashSync('community123', 10);
  const citizenHash = bcrypt.hashSync('citizen123', 10);
  const mentorHash = bcrypt.hashSync('mentor123', 10);
  const judgeHash = bcrypt.hashSync('judge123', 10);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password_hash, phone, city, role)
    VALUES (@name, @email, @password_hash, @phone, @city, @role)
  `);

  insertUser.run({
    name: 'Admin User',
    email: 'admin@socialhub.com',
    password_hash: adminHash,
    phone: '9000000001',
    city: 'Bengaluru',
    role: 'Admin'
  });

  insertUser.run({
    name: 'Ananya Sharma',
    email: 'student@socialhub.com',
    password_hash: studentHash,
    phone: '9000000002',
    city: 'Pune',
    role: 'Student'
  });

  insertUser.run({
    name: 'Ravi Kumar',
    email: 'community@socialhub.com',
    password_hash: communityHash,
    phone: '9000000003',
    city: 'Hyderabad',
    role: 'Community Member'
  });

  insertUser.run({
    name: 'Citizen User',
    email: 'citizen@socialhub.com',
    password_hash: citizenHash,
    phone: '9000000003',
    city: 'Jaipur',
    role: 'Citizen'
  });

  insertUser.run({
    name: 'Meera Nair',
    email: 'mentor@socialhub.com',
    password_hash: mentorHash,
    phone: '9000000004',
    city: 'Delhi',
    role: 'Mentor'
  });

  insertUser.run({
    name: 'Arjun Singh',
    email: 'judge@socialhub.com',
    password_hash: judgeHash,
    phone: '9000000005',
    city: 'Chennai',
    role: 'Judge'
  });

  const insertHackathon = db.prepare(`
    INSERT OR IGNORE INTO hackathons (
      name, description, theme, start_date, end_date, registration_deadline,
      team_size_min, team_size_max, location, mode, status
    ) VALUES (@name, @description, @theme, @start_date, @end_date, @registration_deadline, @team_size_min, @team_size_max, @location, @mode, @status)
  `);

  insertHackathon.run({
    name: 'Green Community Hackathon',
    description: 'Build sustainable environmental solutions for waste and water challenges.',
    theme: 'Sustainability',
    start_date: '2026-10-15',
    end_date: '2026-10-17',
    registration_deadline: '2026-10-08',
    team_size_min: 2,
    team_size_max: 5,
    location: 'Bengaluru',
    mode: 'Hybrid',
    status: 'Registration Open'
  });

  insertHackathon.run({
    name: 'Smart Water Challenge',
    description: 'Create technology-powered solutions for water conservation and smart usage.',
    theme: 'Water Innovation',
    start_date: '2026-11-05',
    end_date: '2026-11-06',
    registration_deadline: '2026-10-25',
    team_size_min: 2,
    team_size_max: 4,
    location: 'Mumbai',
    mode: 'Online',
    status: 'Upcoming'
  });

  insertHackathon.run({
    name: 'Education for All',
    description: 'Enable digital access and learning experiences for underserved communities.',
    theme: 'Education Access',
    start_date: '2026-11-20',
    end_date: '2026-11-22',
    registration_deadline: '2026-11-10',
    team_size_min: 3,
    team_size_max: 6,
    location: 'Delhi',
    mode: 'Offline',
    status: 'Upcoming'
  });

  const problemInsert = db.prepare(`
    INSERT OR IGNORE INTO problems (
      title, description, category, location, city, urgency, people_affected, status, feedback, created_by
    ) VALUES (@title, @description, @category, @location, @city, @urgency, @people_affected, @status, @feedback, @created_by)
  `);

  const studentUser = db.prepare('SELECT id FROM users WHERE email = ?').get('student@socialhub.com');
  const communityUser = db.prepare('SELECT id FROM users WHERE email = ?').get('community@socialhub.com');

  problemInsert.run({
    title: 'Waste segregation in apartment communities',
    description: 'Apartment complexes generate large amounts of mixed waste, but residents do not know how to sort or recycle effectively.',
    category: 'Waste Management',
    location: 'Koramangala',
    city: 'Bengaluru',
    urgency: 'High',
    people_affected: 1200,
    status: 'Approved',
    feedback: 'Strong community need and scalable solution potential.',
    created_by: communityUser.id
  });

  problemInsert.run({
    title: 'Water leakage monitoring for public pipelines',
    description: 'Leakages in municipal pipelines lead to water losses and public inconvenience in local neighbourhoods.',
    category: 'Water',
    location: 'Lucknow',
    city: 'Lucknow',
    urgency: 'Critical',
    people_affected: 800,
    status: 'Approved',
    feedback: 'Thanks to sensor-based monitoring and awareness campaigns.',
    created_by: communityUser.id
  });

  problemInsert.run({
    title: 'Digital access for rural school students',
    description: 'Students in remote communities still face limited access to training and digital learning resources.',
    category: 'Education',
    location: 'Jharkhand',
    city: 'Ranchi',
    urgency: 'High',
    people_affected: 500,
    status: 'Pending',
    feedback: '',
    created_by: communityUser.id
  });

  const hackathonId = db.prepare('SELECT id FROM hackathons WHERE name = ?').get('Green Community Hackathon')?.id;
  const challengeProblemId = db.prepare('SELECT id FROM problems WHERE title = ?').get('Waste segregation in apartment communities')?.id;

  if (hackathonId && challengeProblemId) {
    db.prepare(`
      INSERT OR IGNORE INTO teams (name, description, hackathon_id, challenge_id, team_leader_id, status)
      VALUES (?, ?, ?, ?, ?, 'Active')
    `).run('EcoLoop Crew', 'Creating a smart waste segregation experience for residents.', hackathonId, challengeProblemId, studentUser.id);
  }

  const teamId = db.prepare('SELECT id FROM teams WHERE name = ?').get('EcoLoop Crew')?.id;
  if (teamId) {
    db.prepare(`
      INSERT OR IGNORE INTO team_members (team_id, user_id, role, status)
      VALUES (?, ?, 'Team Leader', 'Accepted')
    `).run(teamId, studentUser.id);

    db.prepare(`
      INSERT OR IGNORE INTO submissions (
        team_id, project_name, problem_statement, proposed_solution, description, innovation,
        technology_used, expected_social_impact, implementation_plan, sustainability_plan,
        github_url, demo_url, presentation_url, status, submitted_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)
    `).run(
      teamId,
      'SmartBin Connect',
      'Apartment communities lack full waste segregation awareness and tracking.',
      'AI-driven waste sorting suggestions and resident engagement dashboard.',
      'A digital platform that helps apartments track waste generation and improve segregation behaviour.',
      'Behaviour-driven innovation helps local communities reduce landfill waste.',
      'Node.js, SQLite, Mobile UI, IoT sensors',
      'Lower landfill rate and more recyclable collection.',
      'Pilot in 3 apartment blocks and measure monthly waste diversion.',
      'Use local volunteers and community incentives for long-term adoption.',
      'https://github.com/demo/smartbin',
      'https://demo.example.com/smartbin',
      'https://demo.example.com/presentation',
      studentUser.id
    );

    const mentorUser = db.prepare('SELECT id FROM users WHERE email = ?').get('mentor@socialhub.com');
    const mentorId = db.prepare('SELECT id FROM mentors WHERE user_id = ?').get(mentorUser.id)?.id;
    if (mentorUser && !mentorId) {
      db.prepare('INSERT OR IGNORE INTO mentors (user_id, expertise, bio) VALUES (?, ?, ?)')
        .run(mentorUser.id, 'Sustainability and product strategy', 'Focused on building practical, scalable social innovation products.');
    }

    const finalMentorId = db.prepare('SELECT id FROM mentors WHERE user_id = ?').get(mentorUser.id)?.id;
    if (finalMentorId) {
      db.prepare('INSERT OR IGNORE INTO mentor_assignments (mentor_id, team_id) VALUES (?, ?)').run(finalMentorId, teamId);
      db.prepare('INSERT OR IGNORE INTO mentor_feedback (team_id, mentor_id, feedback, suggestions, priority) VALUES (?, ?, ?, ?, ?)')
        .run(teamId, finalMentorId, 'Strong problem understanding and clear user impact.', 'Add a stronger pilot story and a simpler dashboard card flow.', 'High');
    }

    const judgeUser = db.prepare('SELECT id FROM users WHERE email = ?').get('judge@socialhub.com');
    const judgeId = db.prepare('SELECT id FROM judges WHERE user_id = ?').get(judgeUser.id)?.id;
    if (judgeUser && !judgeId) {
      db.prepare('INSERT OR IGNORE INTO judges (user_id, expertise) VALUES (?, ?)').run(judgeUser.id, 'Sustainability, civic innovation, product evaluation');
    }

    const judgeEntry = db.prepare('SELECT id FROM judges WHERE user_id = ?').get(judgeUser.id);
    const submissionId = db.prepare('SELECT id FROM submissions WHERE project_name = ?').get('SmartBin Connect')?.id;
    if (judgeEntry && submissionId) {
      db.prepare(`
        INSERT OR IGNORE INTO evaluations (
          submission_id, judge_id, innovation, social_impact, technical_feasibility, scalability, sustainability, presentation, comments, recommendation
        ) VALUES (?, ?, 18, 23, 18, 12, 9, 9, 'Useful community solution with real implementation potential.', 'Shortlist for final round')
      `).run(submissionId, judgeEntry.id);
    }

    db.prepare('INSERT OR IGNORE INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)').run(studentUser.id, 'Your team has been assigned a mentor and the project is active.');
    db.prepare('INSERT OR IGNORE INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)').run(communityUser.id, 'A community problem was approved and published as a challenge.');
  }

  db.prepare('INSERT OR IGNORE INTO contact_messages (name, email, subject, message, read_flag) VALUES (?, ?, ?, ?, 0)').run('Demo Visitor', 'hello@example.com', 'Demo inquiry', 'I am interested in learning more about the hackathon platform.');
}

function initializeDatabase() {
  createTables();
  seedDemoData();
}

module.exports = {
  db,
  initializeDatabase,
};
