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
      title TEXT UNIQUE NOT NULL,
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
      name TEXT UNIQUE NOT NULL,
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
      name TEXT UNIQUE NOT NULL,
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
    phone: '+91 9000000001',
    city: 'Bengaluru',
    role: 'Admin'
  });

  insertUser.run({
    name: 'Ananya Sharma',
    email: 'student@socialhub.com',
    password_hash: studentHash,
    phone: '+91 9000000002',
    city: 'Bengaluru',
    role: 'Student'
  });

  insertUser.run({
    name: 'Ravi Kumar',
    email: 'community@socialhub.com',
    password_hash: communityHash,
    phone: '+91 9000000003',
    city: 'Bengaluru',
    role: 'Community Member'
  });

  insertUser.run({
    name: 'Citizen User',
    email: 'citizen@socialhub.com',
    password_hash: citizenHash,
    phone: '+91 9000000003',
    city: 'Bengaluru',
    role: 'Citizen'
  });

  insertUser.run({
    name: 'Meera Nair',
    email: 'mentor@socialhub.com',
    password_hash: mentorHash,
    phone: '+91 9000000004',
    city: 'New Delhi',
    role: 'Mentor'
  });

  insertUser.run({
    name: 'Dr. Arjun Singh',
    email: 'judge@socialhub.com',
    password_hash: judgeHash,
    phone: '+91 9000000005',
    city: 'Chennai',
    role: 'Judge'
  });

  // Clean out legacy duplicates if present
  const hackathonCount = db.prepare('SELECT count(*) as c FROM hackathons').get().c;
  if (hackathonCount > 3) {
    db.prepare('DELETE FROM evaluations').run();
    db.prepare('DELETE FROM impact_records').run();
    db.prepare('DELETE FROM submissions').run();
    db.prepare('DELETE FROM mentor_feedback').run();
    db.prepare('DELETE FROM mentor_assignments').run();
    db.prepare('DELETE FROM team_members').run();
    db.prepare('DELETE FROM teams').run();
    db.prepare('DELETE FROM hackathon_registrations').run();
    db.prepare('DELETE FROM hackathons').run();
    db.prepare('DELETE FROM problems').run();
  }

  // 1. Prestigious, authentic, logical environmental hackathons
  const insertHackathon = db.prepare(`
    INSERT OR IGNORE INTO hackathons (
      name, description, theme, start_date, end_date, registration_deadline,
      team_size_min, team_size_max, location, mode, status
    ) VALUES (@name, @description, @theme, @start_date, @end_date, @registration_deadline, @team_size_min, @team_size_max, @location, @mode, @status)
  `);

  insertHackathon.run({
    name: 'Jal Jeevan Urban Water Tech Sprint 2026',
    description: 'Build low-cost pipe-acoustic leakage telemetry, IoT dissolved-oxygen sensors, and decentralized filtration to stop urban water loss and industrial river contamination.',
    theme: 'Clean Water & Leakage Telemetry',
    start_date: '2026-10-18',
    end_date: '2026-10-20',
    registration_deadline: '2026-10-10',
    team_size_min: 2,
    team_size_max: 5,
    location: 'Bengaluru & Virtual (Hybrid)',
    mode: 'Hybrid',
    status: 'Registration Open'
  });

  insertHackathon.run({
    name: 'Clean Air & Circular Waste Challenge',
    description: 'Develop computer-vision conveyor sorting for municipal recovery facilities, landfill methane flare monitors, and route logistics for informal waste collectors.',
    theme: 'Waste Circularity & Clean Air',
    start_date: '2026-11-12',
    end_date: '2026-11-14',
    registration_deadline: '2026-11-04',
    team_size_min: 2,
    team_size_max: 4,
    location: 'New Delhi (IIT Campus)',
    mode: 'In-Person',
    status: 'Registration Open'
  });

  insertHackathon.run({
    name: 'EcoGrid Renewable Micro-Solutions',
    description: 'Design DC-coupled solar microgrids with automated battery-health telemetry and SMS alert triggers to protect vaccine cold-chains in rural primary health centers.',
    theme: 'Solar Microgrids & Rural Access',
    start_date: '2026-12-04',
    end_date: '2026-12-06',
    registration_deadline: '2026-11-25',
    team_size_min: 2,
    team_size_max: 5,
    location: 'Pune & Virtual',
    mode: 'Virtual',
    status: 'Upcoming'
  });

  // 2. Realistic, verified grassroots environmental challenges
  const problemInsert = db.prepare(`
    INSERT OR IGNORE INTO problems (
      title, description, category, location, city, urgency, people_affected, image_url, status, feedback, created_by
    ) VALUES (@title, @description, @category, @location, @city, @urgency, @people_affected, @image_url, @status, @feedback, @created_by)
  `);

  const studentUser = db.prepare('SELECT id FROM users WHERE email = ?').get('student@socialhub.com');
  const communityUser = db.prepare('SELECT id FROM users WHERE email = ?').get('community@socialhub.com');
  const citizenUser = db.prepare('SELECT id FROM users WHERE email = ?').get('citizen@socialhub.com');

  problemInsert.run({
    title: 'Bellandur Lake Toxic Foam & Untreated Industrial Effluent',
    description: 'Phosphates from household detergents and untreated industrial chemical discharges create thick toxic froth spilling onto roads and contaminating borewells. Teams needed to build low-cost optical DO/COD sensors and floating wetland remediation modules.',
    category: 'Water',
    location: 'Ward 150 (Bellandur Lake Outlet Bridge)',
    city: 'Bengaluru',
    urgency: 'Critical',
    people_affected: 65000,
    image_url: '/assets/images/challenges/bellandur-lake-froth.jpg',
    status: 'Approved',
    feedback: 'Field verified by Civic Water Action Group. High technical urgency for student innovation squads.',
    created_by: communityUser.id
  });

  problemInsert.run({
    title: 'Okhla Landfill Spontaneous Methane Combustion & Smog Spikes',
    description: 'Over 2,200 tons of unsegregated organic waste produces subsurface methane pockets that combust in summer, driving local PM2.5 above 450. Challenge requires real-time thermal drone/sensor maps and automated material recovery facility conveyor sorting.',
    category: 'Waste Management',
    location: 'Okhla Industrial Area (South East Delhi)',
    city: 'New Delhi',
    urgency: 'High',
    people_affected: 120000,
    image_url: '/assets/images/challenges/okhla-landfill-methane.jpg',
    status: 'Approved',
    feedback: 'Approved for Clean Air & Circular Waste Hackathon Track 1.',
    created_by: citizenUser.id
  });

  problemInsert.run({
    title: 'Arsenic Contamination in Rural Drinking Aquifers',
    description: 'Deep tube wells tap aquifers containing >0.05 mg/L arsenic, causing chronic keratosis and neurotoxic illness. Challenge requires low-cost magnetic iron-oxide filter cartridges and smartphone colorimetric test strips.',
    category: 'Healthcare',
    location: 'Ballia & Ghazipur Rural Belt',
    city: 'Varanasi',
    urgency: 'Critical',
    people_affected: 38000,
    image_url: '/assets/images/challenges/arsenic-tube-well.jpg',
    status: 'Approved',
    feedback: 'Urgent civic health priority verified by rural health workers.',
    created_by: communityUser.id
  });

  problemInsert.run({
    title: 'Urban Heat Island & Micro-Forest Canopy Deficit',
    description: 'Extensive tin roofing and loss of canopy cover elevates ambient working temperatures by +6.8°C over rural areas. Challenge requires satellite thermal hotspot mapping, Miyawaki pocket-forest site recommendation, and automated drip monitoring.',
    category: 'Environment',
    location: 'Ambattur Industrial Estate',
    city: 'Chennai',
    urgency: 'Medium',
    people_affected: 42000,
    image_url: '/assets/images/challenges/urban-heat-island.jpg',
    status: 'Approved',
    feedback: 'Great climate adaptation challenge for student multidisciplinary teams.',
    created_by: citizenUser.id
  });

  problemInsert.run({
    title: 'Vaccine Cold-Chain Outages at Rural Primary Health Centers',
    description: 'Frequent 8-hour grid outages spoil refrigerated DPT and Hepatitis vaccines. Innovators need to build an automated DC-coupled solar inverter with remote battery-health telemetry and SMS alert triggers.',
    category: 'Energy',
    location: 'Khunti District Health Outpost',
    city: 'Ranchi',
    urgency: 'High',
    people_affected: 18500,
    image_url: '/assets/images/challenges/vaccine-coldchain-solar.jpg',
    status: 'Approved',
    feedback: 'Linked with EcoGrid Renewable Micro-Solutions Hackathon Track 2.',
    created_by: communityUser.id
  });

  problemInsert.run({
    title: 'Post-Harvest Paddy Stubble Smoke & Biochar Conversion',
    description: 'Over 15 million tons of paddy straw burned annually due to tight 20-day window before wheat sowing. Opportunity: Low-cost decentralized on-field straw-to-biochar pyrolysis kilns with mobile baler aggregators.',
    category: 'Agriculture',
    location: 'Sangrur & Ludhiana Farm Belt',
    city: 'Ludhiana',
    urgency: 'Critical',
    people_affected: 250000,
    image_url: '/assets/images/challenges/punjab-stubble-smoke.jpg',
    status: 'Approved',
    feedback: 'High regional priority with direct carbon capture impact.',
    created_by: communityUser.id
  });

  // Ensure existing problem rows receive image_urls if previously null
  const updateChallengeImage = db.prepare("UPDATE problems SET image_url = ? WHERE title LIKE ? AND (image_url IS NULL OR image_url = '')");
  updateChallengeImage.run('/assets/images/challenges/bellandur-lake-froth.jpg', '%Bellandur Lake%');
  updateChallengeImage.run('/assets/images/challenges/okhla-landfill-methane.jpg', '%Okhla Landfill%');
  updateChallengeImage.run('/assets/images/challenges/arsenic-tube-well.jpg', '%Arsenic%');
  updateChallengeImage.run('/assets/images/challenges/urban-heat-island.jpg', '%Urban Heat%');
  updateChallengeImage.run('/assets/images/challenges/vaccine-coldchain-solar.jpg', '%Vaccine Cold-Chain%');
  updateChallengeImage.run('/assets/images/challenges/punjab-stubble-smoke.jpg', '%Paddy Stubble%');

  // 3. Realistic student team, project submission, mentor guidance, and jury scoring
  const waterHackathon = db.prepare('SELECT id FROM hackathons WHERE name = ?').get('Jal Jeevan Urban Water Tech Sprint 2026');
  const bellandurProblem = db.prepare('SELECT id FROM problems WHERE title LIKE ?').get('%Bellandur Lake%');

  if (waterHackathon && bellandurProblem && studentUser) {
    // Register Ananya for the hackathon
    db.prepare('INSERT OR IGNORE INTO hackathon_registrations (user_id, hackathon_id, status) VALUES (?, ?, ?)')
      .run(studentUser.id, waterHackathon.id, 'Confirmed');

    // Create Team "HydraSensors Squad"
    db.prepare(`
      INSERT OR IGNORE INTO teams (name, description, hackathon_id, challenge_id, team_leader_id, status)
      VALUES (?, ?, ?, ?, ?, 'Active')
    `).run(
      'HydraSensors Squad',
      'Developing low-cost optical IoT dissolved-oxygen telemetry paired with bio-char wetland filters for Bellandur Lake.',
      waterHackathon.id,
      bellandurProblem.id,
      studentUser.id
    );

    const team = db.prepare('SELECT id FROM teams WHERE name = ?').get('HydraSensors Squad');
    if (team) {
      db.prepare('INSERT OR IGNORE INTO team_members (team_id, user_id, role, status) VALUES (?, ?, ?, ?)')
        .run(team.id, studentUser.id, 'Team Leader & IoT Systems', 'Accepted');

      // Submit project
      db.prepare(`
        INSERT OR IGNORE INTO submissions (
          team_id, project_name, problem_statement, proposed_solution, description, innovation,
          technology_used, expected_social_impact, implementation_plan, sustainability_plan,
          github_url, demo_url, presentation_url, status, submitted_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?)
      `).run(
        team.id,
        'AquaTelemetry & Bio-Filter Grid',
        'High phosphate runoff from detergent and industrial chemical effluents causes continuous toxic lake foaming in Ward 150.',
        'A solar-powered floating buoy with optical DO/COD sensors broadcasting telemetry over LoRaWAN, coupled with modular bio-char filter rafts.',
        'Continuous water quality analytics dashboard with municipal alerts and real-time public open data.',
        'Patented 3D-printed optical turbidity chamber cutting sensor cost from ₹45,000 to ₹3,200 per unit.',
        'ESP32, LoRaWAN, Node.js, SQLite, Chart.js, 3D Printed Casing, Biochar Filter Mats',
        'Directly protects 65,000 residents from toxic spray; flags untreated industrial discharges within 4 minutes.',
        'Deploy 5 buoy nodes along Bellandur canal inlet with BBMP lake department validation.',
        'Local community maintenance funded via lake conservation CSR grants.',
        'https://github.com/socialhub/aqua-telemetry-grid',
        'https://aquasense.demo.socialhub.org',
        'https://docs.google.com/presentation/d/demo-social-hub',
        studentUser.id
      );

      // Mentor Assignment & Feedback
      const mentorUser = db.prepare('SELECT id FROM users WHERE email = ?').get('mentor@socialhub.com');
      if (mentorUser) {
        db.prepare('INSERT OR IGNORE INTO mentors (user_id, expertise, bio) VALUES (?, ?, ?)')
          .run(mentorUser.id, 'Water Quality IoT & CleanTech Architecture', 'Senior CleanTech Systems Engineer with 12+ years in environmental instrumentation.');

        const mentor = db.prepare('SELECT id FROM mentors WHERE user_id = ?').get(mentorUser.id);
        if (mentor) {
          db.prepare('INSERT OR IGNORE INTO mentor_assignments (mentor_id, team_id) VALUES (?, ?)')
            .run(mentor.id, team.id);

          db.prepare('INSERT OR IGNORE INTO mentor_feedback (team_id, mentor_id, feedback, suggestions, priority) VALUES (?, ?, ?, ?, ?)')
            .run(
              team.id,
              mentor.id,
              'Outstanding sensor calibration curves. The bio-char raft design is mechanically sound and low cost.',
              'Ensure the LoRaWAN antenna has conformal coating against high humidity near the foaming spillway.',
              'High'
            );
        }
      }

      // Jury Evaluation
      const judgeUser = db.prepare('SELECT id FROM users WHERE email = ?').get('judge@socialhub.com');
      if (judgeUser) {
        db.prepare('INSERT OR IGNORE INTO judges (user_id, expertise) VALUES (?, ?)')
          .run(judgeUser.id, 'Environmental Engineering & Urban Water Infrastructure');

        const judge = db.prepare('SELECT id FROM judges WHERE user_id = ?').get(judgeUser.id);
        const sub = db.prepare('SELECT id FROM submissions WHERE project_name = ?').get('AquaTelemetry & Bio-Filter Grid');

        if (judge && sub) {
          db.prepare(`
            INSERT OR IGNORE INTO evaluations (
              submission_id, judge_id, innovation, social_impact, technical_feasibility, scalability, sustainability, presentation, comments, recommendation
            ) VALUES (?, ?, 19, 24, 18, 14, 9, 9, 'Top-tier submission. Hardware prototype demonstrates reproducible accuracy. Clear municipal value proposition.', 'Shortlisted for ₹5,00,000 Pilot Deployment Grant')
          `).run(sub.id, judge.id);

          // Impact Record
          db.prepare(`
            INSERT OR IGNORE INTO impact_records (
              submission_id, project_name, implementation_status, people_benefited,
              problems_addressed, estimated_cost, actual_cost, resources_saved,
              time_saved, environmental_impact, community_feedback
            ) VALUES (?, ?, 'Pilot Active', 65000, 'Lake Water Toxic Foaming', '₹1,20,000', '₹48,000', '12 MLD Discharge Monitored', '4 min Alert Response', '40% Phosphate Reduction in Pilot Zone', 'Residents report significant reduction in foam airborne drift.')
          `).run(sub.id, 'AquaTelemetry & Bio-Filter Grid');
        }
      }

      // Notifications
      db.prepare('INSERT OR IGNORE INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)')
        .run(studentUser.id, '🎉 Your project "AquaTelemetry & Bio-Filter Grid" was evaluated: 93/100 (Shortlisted for Pilot Grant)!');

      db.prepare('INSERT OR IGNORE INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)')
        .run(studentUser.id, 'Mentor Meera Nair posted high-priority feedback on your LoRaWAN hardware schematics.');

      db.prepare('INSERT OR IGNORE INTO notifications (user_id, message, read_flag) VALUES (?, ?, 0)')
        .run(communityUser.id, 'Your verified problem "Bellandur Lake Toxic Foam" has been selected by HydraSensors Squad for solution design.');
    }
  }
}

function initializeDatabase() {
  createTables();
  seedDemoData();
}

module.exports = {
  db,
  initializeDatabase,
};
