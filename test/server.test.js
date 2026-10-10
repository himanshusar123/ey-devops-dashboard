import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

describe('EY DevOps Dashboard API Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.IS_CHILD_TEST = 'true';
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/health should respond with 200 and healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.status);
    assert.ok(data.uptimeSeconds >= 0);
    assert.ok(data.checks.ghcrPipeline);
  });

  it('GET /api/metrics should return real-time system and CI/CD telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/metrics`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.telemetry);
    assert.ok(data.ciCdMetadata);
    assert.equal(typeof data.telemetry.cpuUsagePercent, 'number');
    assert.equal(typeof data.telemetry.latencyMs, 'number');
    assert.ok(data.ciCdMetadata.containerRegistry.includes('ghcr.io'));
  });

  it('GET /api/compliance should return governance report with score', async () => {
    const res = await fetch(`${baseUrl}/api/compliance`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.score > 0);
    assert.ok(Array.isArray(data.rules));
  });

  it('POST /api/audit/scan should trigger manual audit refresh', async () => {
    const res = await fetch(`${baseUrl}/api/audit/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator: 'EY Test Lead' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.report);
  });

  it('POST /api/simulate/incident should toggle incident mode', async () => {
    // Turn ON incident
    const resOn = await fetch(`${baseUrl}/api/simulate/incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true })
    });
    const dataOn = await resOn.json();
    assert.equal(dataOn.incidentActive, true);

    // Turn OFF incident
    const resOff = await fetch(`${baseUrl}/api/simulate/incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false })
    });
    const dataOff = await resOff.json();
    assert.equal(dataOff.incidentActive, false);
  });

  it('GET /api/pipeline should list all CI/CD pipeline stages', async () => {
    const res = await fetch(`${baseUrl}/api/pipeline`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.ciCdEngine.includes('GitHub Actions'));
    assert.ok(data.stages.length >= 4);
  });
});
