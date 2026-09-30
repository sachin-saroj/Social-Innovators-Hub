// test_auth.js - Comprehensive automated authentication & security test suite
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('RUNNING AUTHENTICATION & SECURITY TESTS');
  console.log('========================================\n');

  const timestamp = Date.now();
  const testStudentEmail = `test.student.${timestamp}@example.com`;
  const testCitizenEmail = `test.citizen.${timestamp}@example.com`;

  // --- SECTION A: REGISTRATION TESTS ---
  console.log('--- A. Registration Security & Validation ---');

  // A1: Valid Student Registration
  let res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Aarav Mehta',
    email: `  ${testStudentEmail}  `,
    phone: '+91 9876543210',
    city: 'Mumbai',
    role: 'Student',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  });
  assert(res.status === 201 && res.body.token && res.body.user.role === 'Student', 'A1: Valid student registration succeeds with 201 and JWT');
  assert(res.body.user.password_hash === undefined, 'A1.1: Password hash is not exposed in registration response');
  assert(res.body.user.email === testStudentEmail.toLowerCase(), 'A1.2: Email is trimmed and lowercased');

  // A2: Duplicate Email Registration
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Another User',
    email: testStudentEmail,
    role: 'Student',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  });
  assert(res.status === 409 && res.body.message.includes('already exists'), 'A2: Duplicate email registration returns 409');

  // A3: Invalid Email Format
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Invalid Email User',
    email: 'not-an-email',
    role: 'Student',
    password: 'SecurePassword123!',
  });
  assert(res.status === 400 && res.body.message.includes('valid email'), 'A3: Malformed email returns 400');

  // A4: Missing Required Fields
  res = await request('/api/auth/register', { method: 'POST' }, {
    email: 'incomplete@example.com',
  });
  assert(res.status === 400, 'A4: Incomplete registration payload returns 400');

  // A5: Weak Password (< 8 chars)
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Short Pass User',
    email: `shortpass.${timestamp}@example.com`,
    role: 'Citizen',
    password: 'short',
    confirmPassword: 'short',
  });
  assert(res.status === 400 && res.body.message.includes('8 characters'), 'A5: Weak password (< 8 chars) rejected with 400');

  // A6: Password Mismatch
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Mismatch User',
    email: `mismatch.${timestamp}@example.com`,
    role: 'Citizen',
    password: 'SecurePassword123!',
    confirmPassword: 'DifferentPassword123!',
  });
  assert(res.status === 400 && res.body.message.includes('do not match'), 'A6: Password mismatch rejected with 400');

  // A7: Invalid / Unknown Role
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Hacker User',
    email: `hacker.${timestamp}@example.com`,
    role: 'SuperUser',
    password: 'SecurePassword123!',
  });
  assert(res.status === 400 && res.body.message.includes('Invalid account role'), 'A7: Unknown role rejected with 400');

  // A8: Privilege Escalation Attempt: Public Register as Admin
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Fake Admin',
    email: `fakeadmin.${timestamp}@example.com`,
    role: 'Admin',
    password: 'SecurePassword123!',
  });
  assert(res.status === 400 && res.body.message.includes('Invalid account role'), 'A8: Attempted Admin registration strictly rejected (Privilege Escalation Prevention)');

  // A9: Privileged Role Attempt: Public Register as Judge
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Fake Judge',
    email: `fakejudge.${timestamp}@example.com`,
    role: 'Judge',
    password: 'SecurePassword123!',
  });
  assert(res.status === 400 && res.body.message.includes('Invalid account role'), 'A9: Attempted Judge registration strictly rejected');

  // A10: Valid Citizen Registration
  res = await request('/api/auth/register', { method: 'POST' }, {
    name: 'Neha Verma',
    email: testCitizenEmail,
    phone: '9876543210',
    city: 'Bengaluru',
    role: 'Citizen',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
  });
  assert(res.status === 201 && res.body.user.role === 'Citizen', 'A10: Valid citizen registration succeeds');
  const citizenToken = res.body.token;

  // --- SECTION B: LOGIN TESTS ---
  console.log('\n--- B. Login Authentication & Enumeration Prevention ---');

  // B1: Correct Credentials
  res = await request('/api/auth/login', { method: 'POST' }, {
    email: testStudentEmail,
    password: 'SecurePassword123!',
  });
  assert(res.status === 200 && res.body.token && res.body.user.email === testStudentEmail, 'B1: Correct login returns 200 with JWT');
  assert(res.body.user.password_hash === undefined, 'B1.1: Password hash not present in login response');
  const studentToken = res.body.token;

  // B2: Wrong Password
  res = await request('/api/auth/login', { method: 'POST' }, {
    email: testStudentEmail,
    password: 'WrongPassword999!',
  });
  assert(res.status === 401 && res.body.message === 'Invalid email or password.', 'B2: Wrong password returns generic 401 message');

  // B3: Unknown Email (Account Enumeration Prevention)
  res = await request('/api/auth/login', { method: 'POST' }, {
    email: 'nonexistent.user.999@example.com',
    password: 'SomePassword123!',
  });
  assert(res.status === 401 && res.body.message === 'Invalid email or password.', 'B3: Non-existent email returns identical generic 401 message');

  // B4: Missing Email / Password
  res = await request('/api/auth/login', { method: 'POST' }, {
    email: testStudentEmail,
  });
  assert(res.status === 400, 'B4: Missing password returns 400');

  // B5: Malformed Email during login
  res = await request('/api/auth/login', { method: 'POST' }, {
    email: 'not-an-email',
    password: 'SomePassword123!',
  });
  assert(res.status === 401 && res.body.message === 'Invalid email or password.', 'B5: Invalid email format returns generic 401');

  // B6: Demo Admin Login
  res = await request('/api/auth/demo-admin', { method: 'POST' });
  assert(res.status === 200 && res.body.user.role === 'Admin', 'B6: Demo admin login returns 200 with Admin role');
  const adminToken = res.body.token;

  // B7: Demo Citizen Login
  res = await request('/api/auth/demo-citizen', { method: 'POST' });
  assert(res.status === 200 && res.body.user.role === 'Citizen', 'B7: Demo citizen login returns 200 with Citizen role');

  // --- SECTION C: SESSION MANAGEMENT TESTS ---
  console.log('\n--- C. Session Management & Verification ---');

  // C1: GET /api/auth/me with valid student token
  res = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(res.status === 200 && res.body.user.email === testStudentEmail, 'C1: /api/auth/me verifies valid token and returns user profile');

  // C2: GET /api/auth/me without token
  res = await request('/api/auth/me');
  assert(res.status === 401, 'C2: /api/auth/me without header returns 401');

  // C3: GET /api/auth/me with invalid / tampered token
  res = await request('/api/auth/me', {
    headers: { Authorization: 'Bearer thisisnotavalidjwttoken123' },
  });
  assert(res.status === 401 && res.body.message.includes('Invalid or expired'), 'C3: /api/auth/me with tampered token returns 401');

  // C4: POST /api/auth/logout with valid token
  res = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(res.status === 200 && res.body.message === 'Logout successful.', 'C4: /api/auth/logout succeeds with 200');

  // --- SECTION D: AUTHORIZATION & PRIVILEGE ENFORCEMENT ---
  console.log('\n--- D. Role-Based Access Control (RBAC) & Authorization ---');

  // D1: Ordinary Citizen tries to access Admin Dashboard
  res = await request('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert(res.status === 403 && res.body.message.includes('do not have permission'), 'D1: Citizen attempting admin endpoint receives 403 Forbidden');

  // D2: Student tries to access Admin Reports
  res = await request('/api/admin/reports', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(res.status === 403 && res.body.message.includes('do not have permission'), 'D2: Student attempting admin reports receives 403 Forbidden');

  // D3: Admin accesses Admin Dashboard
  res = await request('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(res.status === 200 && res.body.stats && res.body.stats.totalUsers !== undefined, 'D3: Admin successfully accesses Admin Dashboard (200 OK)');

  // D4: Unauthenticated access to Admin endpoint
  res = await request('/api/admin/dashboard');
  assert(res.status === 401, 'D4: Unauthenticated request to admin endpoint receives 401 Unauthorized');

  // --- SECTION E: SECURITY HEADERS ---
  console.log('\n--- E. HTTP Security Headers (Helmet) ---');
  res = await request('/api/health');
  assert(res.headers['x-dns-prefetch-control'] !== undefined, 'E1: Helmet security header X-DNS-Prefetch-Control is present');
  assert(res.headers['x-frame-options'] !== undefined, 'E2: Helmet security header X-Frame-Options is present');
  assert(res.headers['x-content-type-options'] === 'nosniff', 'E3: Helmet security header X-Content-Type-Options: nosniff is active');

  console.log('\n========================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
