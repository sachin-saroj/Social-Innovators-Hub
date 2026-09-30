const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: body ? JSON.parse(body) : null, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('Testing Problem Reporting and Image Upload Pipeline...');

  // 1. Sign in as demo citizen to get token
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/demo-citizen',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Failed to login demo citizen: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.token;
  console.log('✓ Demo citizen logged in, received JWT.');

  // 2. Submit problem with base64 image data
  // 1x1 transparent PNG in base64
  const testPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const testTitle = `Test Broken Water Pipeline in Ward 42 - ${Date.now()}`;
  const problemPayload = {
    title: testTitle,
    category: 'Water',
    city: 'Bengaluru',
    location: 'Ward 42, HSR Layout Sector 1',
    urgency: 'High',
    people_affected: 4500,
    description: 'Fresh drinking water main pipe broken near community playground, causing massive pooling and road submersion.',
    image_data: testPngBase64
  };

  const submitRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/problems',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, problemPayload);

  if (submitRes.status !== 201 || !submitRes.data.problem) {
    throw new Error('Failed to submit problem: ' + JSON.stringify(submitRes.data));
  }

  const problem = submitRes.data.problem;
  console.log('✓ Problem created successfully with ID:', problem.id);
  console.log('✓ Problem image_url saved in DB:', problem.image_url);

  if (!problem.image_url || !problem.image_url.startsWith('/uploads/evidence-')) {
    throw new Error('image_url was not properly saved to /uploads/ folder: ' + problem.image_url);
  }

  // 3. Verify file physically exists on disk
  const relativeFile = problem.image_url.replace('/uploads/', '');
  const physicalPath = path.join(__dirname, 'uploads', relativeFile);
  if (!fs.existsSync(physicalPath)) {
    throw new Error('Uploaded file does not physically exist at: ' + physicalPath);
  }
  const stat = fs.statSync(physicalPath);
  console.log(`✓ Physical file exists on disk (${stat.size} bytes) at: uploads/${relativeFile}`);

  // 4. Verify static file route serves this image
  const fileRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: problem.image_url,
    method: 'GET'
  });

  if (fileRes.status !== 200) {
    throw new Error('Failed to retrieve uploaded image via HTTP static route. Status: ' + fileRes.status);
  }
  console.log('✓ Static route successfully served the uploaded image (HTTP 200).');

  // 5. Submit another problem using sample photo URL
  const sampleTitle = `Industrial Smog Plume over Outer Ring Road - ${Date.now()}`;
  const samplePayload = {
    title: sampleTitle,
    category: 'Environment',
    city: 'Bengaluru',
    location: 'Outer Ring Road, Mahadevapura',
    urgency: 'Critical',
    people_affected: 18000,
    description: 'Dense dark industrial emissions visible every night between 1 AM and 5 AM causing respiratory stress to nearby apartment clusters.',
    image_url: '/assets/images/challenges/okhla-landfill-methane.jpg'
  };

  const sampleSubmitRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/problems',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, samplePayload);

  if (sampleSubmitRes.status !== 201 || !sampleSubmitRes.data.problem) {
    throw new Error('Failed to submit sample problem: ' + JSON.stringify(sampleSubmitRes.data));
  }
  console.log('✓ Sample problem created with image_url:', sampleSubmitRes.data.problem.image_url);

  // 6. Verify problems list returns both problems with image_url
  const listRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/problems',
    method: 'GET'
  });

  const foundUpload = listRes.data.find(p => p.id === problem.id);
  const foundSample = listRes.data.find(p => p.id === sampleSubmitRes.data.problem.id);

  if (!foundUpload || !foundUpload.image_url) {
    throw new Error('Uploaded problem not found in /api/problems list or missing image_url.');
  }
  if (!foundSample || !foundSample.image_url) {
    throw new Error('Sample problem not found in /api/problems list or missing image_url.');
  }
  console.log('✓ Both problems verified in /api/problems with valid image_url values.');

  console.log('\n========================================');
  console.log('ALL PHOTO UPLOAD & DATABASE TESTS PASSED!');
  console.log('========================================');
}

run().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
