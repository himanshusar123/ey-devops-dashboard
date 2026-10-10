import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateAuditChecklist
} from './complianceEngine.js';
import {
  getSystemMetrics,
  trackRequest,
  toggleIncidentSimulation,
  isIncidentActive,
  getAuditLogs,
  addAuditLog
} from './metricsCollector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use((req, res, next) => {
    trackRequest();
    // Security headers (aligned with enterprise standards)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-App-Release', process.env.IMAGE_TAG || 'v1.0.0');
    next();
  });

  // Serve static UI assets
  app.use(express.static(publicDir));

  // Kubernetes / Docker Healthcheck endpoint (Liveness & Readiness probe)
  app.get(['/health', '/api/health'], (req, res) => {
    const degraded = isIncidentActive();
    const statusCode = degraded ? 200 : 200; // Still 200 for liveness, but status note
    res.status(statusCode).json({
      status: degraded ? 'degraded' : 'healthy',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      gitCommitSha: process.env.GIT_COMMIT_SHA || 'e7f41a9',
      imageTag: process.env.IMAGE_TAG || 'ghcr.io/ey/devops-dashboard:latest',
      checks: {
        database: 'connected',
        clusterStorage: 'ready',
        ghcrPipeline: 'verified',
        complianceGuardrail: degraded ? 'warning' : 'passed'
      }
    });
  });

  // Telemetry & Metrics endpoint
  app.get('/api/metrics', (req, res) => {
    const metrics = getSystemMetrics();
    res.json(metrics);
  });

  // Enterprise Compliance Audit endpoint
  app.get('/api/compliance', (req, res) => {
    const report = evaluateAuditChecklist(isIncidentActive());
    res.json(report);
  });

  // Trigger manual compliance scan (simulated on-demand audit)
  app.post('/api/audit/scan', (req, res) => {
    addAuditLog(
      'MANUAL_AUDIT_SCAN_REQUESTED',
      req.body.operator || 'EY Cloud Architect',
      'Triggered full enterprise compliance & governance re-validation.'
    );
    const report = evaluateAuditChecklist(isIncidentActive());
    res.json({
      success: true,
      message: 'On-demand compliance assessment completed successfully.',
      report
    });
  });

  // Chaos Engineering & Incident simulation toggle
  app.post('/api/simulate/incident', (req, res) => {
    const newState = toggleIncidentSimulation(req.body.active);
    res.json({
      success: true,
      incidentActive: newState,
      message: newState
        ? 'Simulated production anomaly triggered. Latency and error rates increased.'
        : 'Incident simulation cleared. All container health metrics normalized.'
    });
  });

  // Audit Logs endpoint
  app.get('/api/logs', (req, res) => {
    res.json({
      logs: getAuditLogs()
    });
  });

  // Pipeline & CI/CD deployment info endpoint
  app.get('/api/pipeline', (req, res) => {
    res.json({
      project: 'EY Enterprise IT Operations & Compliance Dashboard',
      repository: 'https://github.com/himanshusar123/ey-devops-dashboard',
      ciCdEngine: 'GitHub Actions',
      containerRegistry: 'GitHub Container Registry (ghcr.io)',
      stages: [
        { name: 'Lint & Syntax Verification', status: 'SUCCESS', tool: 'Custom Rules & Node CLI' },
        { name: 'Automated Unit Tests', status: 'SUCCESS', tool: 'Node.js Test Runner' },
        { name: 'Security Audit & Dependency Scan', status: 'SUCCESS', tool: 'npm audit / Trivy' },
        { name: 'Multi-stage Docker Build', status: 'SUCCESS', tool: 'Docker Buildx' },
        { name: 'GHCR Container Image Push', status: 'SUCCESS', tool: 'docker/build-push-action' },
        { name: 'Automated Executive Summary', status: 'SUCCESS', tool: 'GitHub Step Summary' }
      ]
    });
  });

  // Fallback route for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

// Start standalone server when executed directly as entrypoint
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const PORT = process.env.PORT || 3000;
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 EY DevOps & Compliance Dashboard is running!`);
    console.log(`🌐 Local URL:  http://localhost:${PORT}`);
    console.log(`🩺 Health API: http://localhost:${PORT}/api/health`);
    console.log(`📊 Metrics:   http://localhost:${PORT}/api/metrics`);
    console.log(`🛡️ Compliance: http://localhost:${PORT}/api/compliance`);
    console.log(`📦 Container:  ghcr.io/ey-demo/devops-dashboard`);
    console.log(`======================================================\n`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n[${signal}] Initiating graceful shutdown...`);
    server.close(() => {
      console.log('HTTP server closed. Exiting process cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
