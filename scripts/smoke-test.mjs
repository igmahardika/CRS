import { spawn } from 'child_process';
import http from 'http';

const PORT = 3098;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runSmokeTest() {
  console.log(`[Smoke Test] Starting Next.js app on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    shell: true,
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => process.stdout.write(`[server stdout] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server stderr] ${d}`));

  let ready = false;
  // Poll until server is ready (max 30s)
  for (let i = 0; i < 30; i++) {
    await wait(1000);
    try {
      const res = await request('/login');
      if (res.statusCode === 200) {
        ready = true;
        console.log('[Smoke Test] Server is responsive!');
        break;
      }
    } catch {
      // server still starting
    }
  }

  if (!ready) {
    server.kill();
    console.error('[Smoke Test] FAILED: Server did not respond within 30 seconds.');
    process.exit(1);
  }

  try {
    // 1. Test /login returns 200
    const loginRes = await request('/login');
    console.log(`[Smoke Test] GET /login -> status ${loginRes.statusCode}`);
    if (loginRes.statusCode !== 200) {
      throw new Error(`Expected 200 on /login, got ${loginRes.statusCode}`);
    }

    // 2. Test / redirects to /login for unauthenticated request
    const rootRes = await request('/');
    console.log(`[Smoke Test] GET / -> status ${rootRes.statusCode}, location: ${rootRes.headers.location}`);
    if (rootRes.statusCode !== 307 && rootRes.statusCode !== 302) {
      throw new Error(`Expected 302/307 redirect on /, got ${rootRes.statusCode}`);
    }

    // 3. Test unauthenticated /api/customers returns 401
    const apiRes = await request('/api/customers');
    console.log(`[Smoke Test] GET /api/customers -> status ${apiRes.statusCode}`);
    if (apiRes.statusCode !== 401) {
      throw new Error(`Expected 401 on /api/customers, got ${apiRes.statusCode}`);
    }

    // 4. Test unauthenticated /api/health returns 200 with healthy status
    const healthRes = await request('/api/health');
    console.log(`[Smoke Test] GET /api/health -> status ${healthRes.statusCode}`);
    if (healthRes.statusCode !== 200) {
      throw new Error(`Expected 200 on /api/health, got ${healthRes.statusCode}`);
    }
    const healthJson = JSON.parse(healthRes.body);
    if (healthJson.status !== 'healthy' || healthJson.checks?.database?.status !== 'healthy') {
      throw new Error(`Health check indicated unhealthy state: ${healthRes.body}`);
    }
    console.log('[Smoke Test] Health check confirmed DB connectivity and server health.');

    console.log('[Smoke Test] PASSED: All smoke test checks succeeded.');
  } finally {
    console.log('[Smoke Test] Stopping server...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
    } else {
      server.kill('SIGTERM');
    }
  }
}

runSmokeTest().catch((err) => {
  console.error('[Smoke Test] ERROR:', err);
  process.exit(1);
});
