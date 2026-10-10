/**
 * EY Compliance & Security Governance Rules Engine
 * Simulates enterprise compliance evaluation against standard regulatory frameworks:
 * - SOC 2 Type II
 * - ISO/IEC 27001:2022
 * - CIS Cloud Security Benchmarks
 * - OWASP Top 10 (2025/2026)
 * - Zero Trust Network Access (ZTNA)
 */

export const complianceRules = [
  {
    id: "SOC2-CC6.1",
    framework: "SOC 2 Type II",
    title: "Logical Access Controls & Multi-Factor Authentication",
    category: "Identity & Access",
    status: "PASS",
    severity: "HIGH",
    description: "MFA enforced across 100% of cloud console and CLI access points.",
    lastChecked: new Date().toISOString()
  },
  {
    id: "ISO27001-A.8.24",
    framework: "ISO 27001",
    title: "Cryptographic Controls & TLS 1.3 Enforcement",
    category: "Data Protection",
    status: "PASS",
    severity: "CRITICAL",
    description: "All endpoints strictly require TLS 1.3 with AES-256-GCM ciphers.",
    lastChecked: new Date().toISOString()
  },
  {
    id: "CIS-AWS-1.16",
    framework: "CIS Benchmarks",
    title: "IAM Policies with Least Privilege & Read-Only CI/CD Credentials",
    category: "Cloud Governance",
    status: "PASS",
    severity: "HIGH",
    description: "GitHub Actions uses scoped GITHUB_TOKEN instead of long-lived access keys.",
    lastChecked: new Date().toISOString()
  },
  {
    id: "OWASP-A03",
    framework: "OWASP Top 10",
    title: "Automated Dependency & Container Vulnerability Scanning",
    category: "Application Security",
    status: "PASS",
    severity: "CRITICAL",
    description: "Multi-stage Docker build excludes devDependencies and runs as unprivileged user.",
    lastChecked: new Date().toISOString()
  },
  {
    id: "ZTNA-04",
    framework: "Zero Trust",
    title: "Continuous Health Probes & Immutable Container Workloads",
    category: "DevOps & SRE",
    status: "PASS",
    severity: "MEDIUM",
    description: "Container filesystem is read-only except for ephemeral /tmp with liveness checks.",
    lastChecked: new Date().toISOString()
  },
  {
    id: "EY-AUDIT-08",
    framework: "EY Global IT Standards",
    title: "Automated CI/CD Quality Gates & Mandatory Code Reviews",
    category: "Engineering Rigor",
    status: "PASS",
    severity: "HIGH",
    description: "Branch protection rules require unit test passing & automated lint before GHCR release.",
    lastChecked: new Date().toISOString()
  }
];

export function calculateComplianceScore(rules = complianceRules) {
  if (!rules.length) return 0;
  const passed = rules.filter(r => r.status === "PASS").length;
  return Math.round((passed / rules.length) * 100);
}

export function evaluateAuditChecklist(incidentActive = false) {
  const currentRules = complianceRules.map(rule => {
    if (incidentActive && rule.id === "ZTNA-04") {
      return {
        ...rule,
        status: "WARNING",
        description: "Simulated alert: High latency detected in container cluster pod replica 2.",
        lastChecked: new Date().toISOString()
      };
    }
    return {
      ...rule,
      lastChecked: new Date().toISOString()
    };
  });

  const score = calculateComplianceScore(currentRules);
  const status = score >= 90 ? "OPTIMAL" : score >= 75 ? "ATTENTION" : "CRITICAL";

  return {
    score,
    status,
    totalRules: currentRules.length,
    passedRules: currentRules.filter(r => r.status === "PASS").length,
    warningRules: currentRules.filter(r => r.status === "WARNING").length,
    failedRules: currentRules.filter(r => r.status === "FAIL").length,
    rules: currentRules,
    evaluatedAt: new Date().toISOString()
  };
}
