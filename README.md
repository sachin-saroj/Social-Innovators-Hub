# 🌿 Social Innovators Hub

> **Grassroots Ecological Innovation & Civic Climate Hackathon Platform**  
> *Transforming localized community environmental breakdowns into verified, measurable green solutions through engineering hackathons.*

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/database-SQLite%203-blue.svg)](https://www.sqlite.org/)
[![Security Tests](https://img.shields.io/badge/tests-31%20passed-success.svg)](./test_auth.js)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./package.json)
[![UI Aesthetic](https://img.shields.io/badge/aesthetic-Clay.com%20Design%20System-orange.svg)](https://clay.com)

---

## 📖 Overview

**Social Innovators Hub** connects citizens documenting ground-level ecological crises (lake chemical foaming, burning landfill plumes, arsenic aquifers, industrial smog) directly with student engineering teams, hackathons, and municipal authorities.

Built with a tactile, playful **Clay.com design system** (warm cream canvas `#fffaf0`, Plus Jakarta Sans typography, and handcrafted 3D claymation visual assets), the platform replaces abstract problem lists with verified photographic ground proof, structured challenge briefs, and measurable civic impact tracking.

---

## 🌟 Core Modules & Architecture

### 1. Citizen Evidence Desk (4-Pillar Problem Reporting)
- **Pillar 01 — Issue Identification & Priority:** Title input, environmental category selector (Water, Waste, Smog, Clean Energy, Stubble/Agriculture), and interactive radio cards for *Low*, *Medium*, *High*, and *Critical* urgency.
- **Pillar 02 — Location & Impact Scope:** City, neighborhood/ward, and estimated citizens affected with **Quick Population Preset Chips** (`~500`, `~5,000`, `~25,000`, `~75,000+`).
- **Pillar 03 — Ground Photographic Evidence:**
  - Interactive **Drag & Drop Zone** + native device file picker.
  - **Live Photo Preview Card** displaying filename, format/size, and "Change Photo" / "Remove" actions.
  - **1-Click Sample Evidence Chips** (`Lake Toxic Froth`, `Landfill Methane Smoke`, `Arsenic Contaminated Well`, `Paddy Stubble Smoke`) for rapid demo testing.
  - Strict client & server validation (max 5MB, JPG/PNG/WEBP/GIF MIME whitelist).
- **Pillar 04 — Field Observation & Technical Guidance:** Guided context textarea with dynamic 20-character counter.

### 2. Verified Civic Challenges Directory
- Public-facing cards with **Verified Photographic Proof** thumbnails and `📸 Photo Evidence` badges.
- **Challenge Brief Modal:** Inspect high-resolution field photos, citizen impact metrics, ground reality statements, and civic validator notes.
- Direct **"Form a Squad to Solve This"** CTA pre-binding the problem to hackathon squad registration.

### 3. Green Hackathons & Squad Registration
- Hackathon directory with venue formats (Hybrid / In-Person), schedules, cash prizes, and registration deadlines.
- Interactive squad registration modal mapping teams directly to active civic challenges.

### 4. Innovator & Citizen Dashboard
- Persona-specific workspaces (Student Innovator, Citizen Reporter, Platform Admin).
- **"My Reported Issues" Tab:** Displays submitted problems with status pills (*Pending*, *Approved*, *Rejected*), municipal review notes, and photo thumbnails with full-resolution view links.
- Real-time notification feed tracking incident review milestones.

### 5. Municipal Governance & CSV Export
- Admin review queue for reviewing, prioritizing, and approving/rejecting community reports.
- **Dual-Route CSV Export** (`/api/admin/reports/export` & `/api/admin/reports/export.csv`) exporting filtered community reports with complete metadata, including **Photo Evidence URLs**.

---

## 🛡️ Security & Reliability Architecture

- **Authentication:** JSON Web Tokens (JWT) signed with configurable expiration (`24h`).
- **Password Hashing:** `bcryptjs` with salt rounds = 10; password hashes are strictly scrubbed from all API responses.
- **Role-Based Access Control (RBAC):** Strict middleware protecting administrative and reporting endpoints (`requireAuth`, `requireRole('Admin')`).
- **HTTP Security Headers:** Protected with `helmet` (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control`).
- **Rate Limiting:** Auth endpoint rate-limiting via `express-rate-limit` (100 req / 15 min per IP).
- **Zero Raw String SQL:** All database interactions use prepared statements in `better-sqlite3` to prevent SQL Injection.
- **Safe Binary Storage:** Decodes base64 buffers directly with Node.js standard library `crypto` and `Buffer` without heavy third-party file dependencies; validates file signatures and limits payloads to 5MB.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), Semantic HTML5, Custom CSS3 Design Tokens |
| **Design System** | Clay.com Playful SaaS Aesthetic (`#fffaf0` Cream Canvas, Plus Jakarta Sans, 3D Claymation Assets) |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite via `better-sqlite3` (Embedded, high performance, synchronous execution) |
| **Security** | `jsonwebtoken`, `bcryptjs`, `helmet`, `express-rate-limit` |
| **Testing** | Node.js native test runner (`test_auth.js` + `test_problem_upload.js`) |

---

## 📁 Repository Structure

```
├── assets/
│   ├── images/
│   │   ├── challenges/        # Verified photographic ground evidence assets
│   │   ├── hero.jpg           # 3D claymation hero illustration
│   │   ├── logo.jpg / .png    # Official 3D claymation brand logo
│   │   ├── logo.svg           # Scalable vector logo emblem
│   │   ├── mascot.jpg         # Claymation eco-innovator mascot
│   │   └── mountains.jpg      # Clay horizon footer illustration
│   └── logo.svg               # Root brand vector asset
├── uploads/                   # Persistent user-uploaded evidence directory
│   └── .gitkeep
├── database.js                # SQLite schema migrations, tables & seeded challenge data
├── index.html                 # Single Page Application UI & accessible modal dialogs
├── package.json               # Dependencies, metadata & test scripts
├── script.js                  # Frontend state management, API client & dropzone handlers
├── server.js                  # Express REST API, auth routes & static file serving
├── style.css                  # Clay.com design system tokens, components & animations
├── test_auth.js               # 31-test security, RBAC & authentication verification suite
├── test_problem_upload.js     # End-to-end image upload & database persistence test
├── favicon.ico / favicon.svg  # Multi-resolution browser favicons
└── .env.example               # Environment variable specification template
```

---

## ⚡ Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/sachin-saroj/Social-Innovators-Hub.git
cd Social-Innovators-Hub

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### 3. Launch Development Server
```bash
# Start server
npm start

# Or with automatic reload on changes:
npm run dev
```

The application will be live at: **`http://localhost:3000`**

---

## 🚀 Deployment on Render (Step-by-Step)

This repository includes a [`render.yaml`](./render.yaml) blueprint and container host-binding for 100% automated deployment on [Render](https://render.com/).

### Option 1: Automated Blueprint Deployment (1-Click)
1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in with GitHub.
2. Click the **"New +"** button in the top navigation and select **"Blueprint"**.
3. Select your repository: `sachin-saroj/Social-Innovators-Hub`.
4. Render will read `render.yaml`, automatically set up the web service, generate a cryptographically strong `JWT_SECRET`, and deploy.

### Option 2: Standard Web Service Setup
1. On [Render Dashboard](https://dashboard.render.com/), click **"New +"** -> **"Web Service"**.
2. Connect your GitHub repository `https://github.com/sachin-saroj/Social-Innovators-Hub`.
3. Fill in the following settings:
   - **Name:** `social-innovators-hub` (or any custom name)
   - **Environment:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. In the **Environment Variables** section, add:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = *(Enter any secret random string or click Generate)*
   - `JWT_EXPIRES_IN` = `24h`
5. Click **"Deploy Web Service"**.
6. Once the build completes, Render will provide your public live URL (e.g., `https://social-innovators-hub.onrender.com`).

---

## 🧪 Running Automated Tests

The test suite runs 31 automated authentication/security tests and complete photo upload integration tests:

```bash
npm test
```

### What `npm test` Validates:
1. **Registration Security:** Duplicate emails (409), invalid formats (400), weak passwords (<8 chars), and privilege escalation prevention (cannot register as Admin or Judge).
2. **Login & Enumeration Prevention:** Identical generic 401 error responses for non-existent emails vs. incorrect passwords.
3. **Session Verification:** Token tampering detection and `/api/auth/me` profile resolution.
4. **Role-Based Access Control (RBAC):** Citizens and Students blocked from Admin APIs (403 Forbidden).
5. **Helmet Security Headers:** `X-Frame-Options`, `X-Content-Type-Options: nosniff`.
6. **Ground Photo Upload & Database Storage:** Base64 upload decoding, file creation in `uploads/`, SQLite `image_url` row validation, and HTTP 200 static asset delivery.

---

## 👤 Demo Accounts

The platform includes pre-seeded demo accounts with one-click shortcuts on the login dialog:

| Role | Email | Password | Shortcut |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@socialhub.com` | `admin123` | Click **"Continue as Demo Admin"** |
| **Citizen Reporter** | `citizen@socialhub.com` | `citizen123` | Click **"Continue as Demo Citizen"** |
| **Student Innovator** | `student@socialhub.com` | `student123` | Regular Sign In |
| **Community Member** | `community@socialhub.com` | `community123` | Regular Sign In |

---

## 📡 REST API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new Student or Citizen account |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT |
| `POST` | `/api/auth/demo-admin` | Public | Quick sign-in as municipal administrator |
| `POST` | `/api/auth/demo-citizen` | Public | Quick sign-in as neighborhood citizen |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile from token |
| `POST` | `/api/auth/logout` | Authenticated | Terminate session and invalidate client state |
| `GET` | `/api/problems` | Public | List approved environmental problems & photo evidence |
| `POST` | `/api/problems` | Authenticated | Submit civic breakdown with base64 photo upload |
| `GET` | `/api/hackathons` | Public | List active and upcoming sustainability hackathons |
| `POST` | `/api/hackathons/:id/squad-register` | Authenticated | Register innovation squad mapped to challenge |
| `GET` | `/api/dashboard/stats` | Public | Aggregated platform counter metrics |
| `GET` | `/api/dashboard/my-activity` | Authenticated | User-specific registered hackathons, squads & reports |
| `GET` | `/api/admin/reports` | Admin Only | Filtered community reports management queue |
| `GET` | `/api/admin/reports/export` | Admin Only | Export community reports as structured CSV |
| `PUT` | `/api/admin/reports/:id` | Admin Only | Update report status (`Approved` / `Rejected`) & feedback |

---

## 📄 License

This project is licensed under the [MIT License](./package.json).
