# 🌱 Social Innovators Hub — Environmental & Sustainability Hackathon Platform

**Social Innovators Hub** is a community-driven environmental hackathon and green innovation platform designed to transform real-world ecological and community challenges into actionable, high-impact solutions. It brings together students, eco-innovators, citizens, mentors, judges, and administrators to collaborate on sustainable technology, waste management, water conservation, renewable energy, and climate resilience.

---

## 🌍 Platform Overview & Eco-Focus

- **Environmental Problem Reporting:** Citizens and local communities report real ecological issues (waste accumulation, water scarcity, pollution hotspots, green cover loss).
- **Green Hackathons:** Structured hackathons focused on Environmental Sustainability, Clean Tech, Smart Water, Renewable Energy, and Circular Economy.
- **Student Team Collaboration:** Multi-disciplinary student teams register, form squads, and build prototype solutions targeted at verified community challenges.
- **Mentorship & Judging:** Domain experts and sustainability judges provide feedback, evaluate feasibility, social & ecological impact, scalability, and sustainability.
- **Impact Tracking & Admin Oversight:** Administrators review community reports, approve hackathon entries, track verified impact metrics, and export data.

---

## 🚀 Key Features

- **Eco Challenge & Problem Submissions:** Citizens report local environmental problems with severity, location, and details.
- **Admin Verification & Workflow:** Review, verify, prioritize, and approve community environmental challenges for upcoming hackathons.
- **Hackathon Directory & Registration:** Browse live and upcoming environmental hackathons with schedules, team size rules, and guidelines.
- **Student Team Portal & Project Submissions:** Submit project prototypes complete with problem statement, tech stack, environmental impact forecast, and demo links.
- **Mentor & Judge Evaluation Dashboards:** Structured scoring rubrics evaluating innovation, environmental impact, technical feasibility, and sustainability.
- **Instant Demo Access:** One-click shortcuts for Demo Admin, Citizen, Student, Mentor, and Judge roles.
- **Admin Reports & Analytics:** Filter and search reports, track resolution statuses, and export CSV summaries.
- **Persistent Local Database:** Backed by SQLite (`better-sqlite3`) with pre-seeded eco-hackathons, real-world problems, and demo profiles.

---

## 🛠️ Tech Stack

- **Frontend:** Semantic HTML5, Modern Responsive CSS3, Vanilla JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** SQLite with `better-sqlite3`
- **Security & Auth:** JWT (JSON Web Tokens), bcryptjs password hashing, role-based access control (RBAC)

---

## 📁 Project Structure

```
├── index.html           # Main user interface & application views
├── style.css            # Stylesheets, responsive layout & visual design
├── script.js            # Frontend logic, API interactions & state management
├── server.js            # Express API server & authentication endpoints
├── database.js          # SQLite schema definitions & eco-seed dataset
├── socialhub.db         # Persistent SQLite database (generated at runtime)
├── .env.example         # Environment configuration template
└── package.json         # Project metadata and dependencies
```

---

## ⚡ Quick Start / Installation

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 2. Clone & Setup
```bash
git clone https://github.com/sachin-saroj/social-innovators-hub.git
cd social-innovators-hub
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
```bash
cp .env.example .env
```

### 5. Launch the Server
```bash
npm start
# or for live reload during development:
npm run dev
```

### 6. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in your web browser.

---

## 👤 Demo Accounts

| Role | Email | Password | Quick Shortcut |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@socialhub.com` | `admin123` | Click **"Continue as Demo Admin"** |
| **Citizen** | `citizen@socialhub.com` | `citizen123` | Click **"Continue as Demo Citizen"** |
| **Student** | `student@socialhub.com` | `student123` | Email / Password login |
| **Community** | `community@socialhub.com` | `community123` | Email / Password login |
| **Mentor** | `mentor@socialhub.com` | `mentor123` | Email / Password login |
| **Judge** | `judge@socialhub.com` | `judge123` | Email / Password login |

---

## 🌿 Future Roadmap

- [ ] Automated carbon footprint & ecological impact estimation tools
- [ ] Integration with municipal open data and environmental sensors
- [ ] Leaderboard and automated certificates for winning green innovators
- [ ] Direct file and media upload for on-ground environmental reports
- [ ] Sponsor and green grant funding integration

---

## 📄 License
This project is licensed under the MIT License.
