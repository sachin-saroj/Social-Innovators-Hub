# Social Innovators Hub

Social Innovators Hub is a community-driven hackathon and innovation platform that connects students, community members, mentors, judges and administrators. The project helps convert real-world social problems into hackathon challenges, team-based solution building and result-driven impact tracking.

## Features

- Community problem reporting and admin approval workflow
- Demo admin login for immediate admin access
- Demo citizen login for community/public access
- Admin reports dashboard with search, filters and status actions
- CSV export for community reports
- Public hackathon listing and registration
- Team creation workflows and problem-driven participation
- Project submission flow for student teams
- Mentor and judge dashboards
- Notification system
- Contact form for inquiries
- Role-based access for students, mentors, judges and admins
- SQLite database for persistent demo data
- Express.js backend with JWT authentication

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: SQLite with better-sqlite3
- Authentication: JWT + bcryptjs

## Project structure

- `index.html` – main UI
- `style.css` – styling and layout
- `script.js` – frontend logic and API calls
- `server.js` – backend server
- `database.js` – SQLite schema and seed data
- `socialhub.db` – SQLite database file generated at runtime
- `.env.example` – environment variables template

## Installation

1. Open the project folder.
2. Install dependencies:

```bash
npm install
```

3. Create the environment file:

```bash
cp .env.example .env
```

4. Start the server:

```bash
npm start
```

5. Open the application in your browser:

```bash
http://localhost:3000
```

## Demo accounts

- Admin: admin@socialhub.com / admin123
- Demo Admin shortcut: use the “Continue as Demo Admin” button in the login modal
- Citizen: citizen@socialhub.com / citizen123
- Demo Citizen shortcut: use the “Continue as Demo Citizen” button in the login modal
- Student: student@socialhub.com / student123
- Community member: community@socialhub.com / community123
- Mentor: mentor@socialhub.com / mentor123
- Judge: judge@socialhub.com / judge123

## Notes

This is a demo-ready social innovation platform intended for college project demonstration. It prioritizes a clear architecture and working functionality over excessive complexity.

## Future scope

- Add real team invitations and mentor assignment workflows
- Add full admin CRUD dashboards for users and messages
- Add evaluation scoring leaderboard and final winner publishing
- Add impact reporting and analytics views
- Add file uploads and document storage
