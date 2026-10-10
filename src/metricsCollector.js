import os from 'node:os';

const startTime = Date.now();
let requestCount = 0;
let incidentSimulationActive = false;

const auditLogs = [
  {
    id: "LOG-1001",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    event: "CONTAINER_DEPLOYMENT_SUCCESS",
    actor: "GitHub Actions / ghcr.io",
    details: "Container image deployed with digest sha256:7f9b8c..."
  },
  {
    id: "LOG-1002",
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    event: "PIPELINE_QUALITY_GATE_PASS",
    actor: "CI/CD Test Runner",
    details: "100% unit tests passed. 0 high severity CVEs detected."
  },
  {
    id: "LOG-1003",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    event: "COMPLIANCE_EVALUATION",
    actor: "EY Governance Engine",
    details: "SOC2, ISO27001, and CIS benchmarks verified and compliant."
  }
];

export function trackRequest() {
  requestCount++;
}

export function toggleIncidentSimulation(status) {
  if (typeof status === 'boolean') {
    incidentSimulationActive = status;
  } else {
    incidentSimulationActive = !incidentSimulationActive;
  }

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event: incidentSimulationActive ? "INCIDENT_SIMULATION_TRIGGERED" : "INCIDENT_RESOLVED_AUTO_HEAL",
    actor: "Chaos Engineering Simulator",
    details: incidentSimulationActive 
      ? "Simulated latency anomaly and pod health degradation." 
      : "Automated container self-healing completed; cluster metrics normalized."
  });

  if (auditLogs.length > 25) auditLogs.pop();
  return incidentSimulationActive;
}

export function isIncidentActive() {
  return incidentSimulationActive;
}

export function getSystemMetrics() {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  // Base latency with jitter (or spikes if incident active)
  const baseLatency = incidentSimulationActive ? 420 : 18;
  const latency = Math.round(baseLatency + (Math.random() * 12));
  
  // Simulated CPU load
  const simulatedCpu = incidentSimulationActive 
    ? Math.min(94, Math.round(75 + Math.random() * 20))
    : Math.min(35, Math.round(12 + Math.random() * 15));

  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    requestCount,
    incidentSimulationActive,
    telemetry: {
      cpuUsagePercent: simulatedCpu,
      latencyMs: latency,
      memoryRssMb: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
      activePods: incidentSimulationActive ? "2/3 Ready" : "3/3 Healthy",
      environment: process.env.NODE_ENV || 'production'
    },
    systemInfo: {
      platform: os.platform(),
      nodeVersion: process.version,
      hostname: os.hostname(),
      arch: os.arch()
    },
    ciCdMetadata: {
      gitCommitSha: process.env.GIT_COMMIT_SHA || process.env.GITHUB_SHA || "e7f41a9",
      gitBranch: process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || "main",
      workflowRunId: process.env.GITHUB_RUN_ID || "138947201",
      containerRegistry: "ghcr.io/ey-consulting/devops-dashboard",
      imageTag: process.env.IMAGE_TAG || "v1.0.0-release",
      pipelineStatus: incidentSimulationActive ? "DEGRADED" : "HEALTHY"
    }
  };
}

export function getAuditLogs() {
  return auditLogs;
}

export function addAuditLog(event, actor, details) {
  const entry = {
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    event,
    actor,
    details
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 25) auditLogs.pop();
  return entry;
}
