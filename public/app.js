// EY Enterprise DevOps Dashboard Frontend Logic
document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentFilter = 'all';
  let latencyHistory = [18, 20, 17, 19, 22, 18, 19, 21, 18, 19, 20, 18];
  let isIncidentActive = false;

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const btnRunAudit = document.getElementById('btn-run-audit');
  const btnChaosToggle = document.getElementById('btn-chaos-toggle');
  const chaosBtnText = document.getElementById('chaos-btn-text');
  const incidentBanner = document.getElementById('incident-banner');
  const btnBannerResolve = document.getElementById('btn-banner-resolve');
  const btnTriggerChaosAction = document.getElementById('btn-trigger-chaos-action');
  const btnResolveChaosAction = document.getElementById('btn-resolve-chaos-action');
  const btnRefreshLogs = document.getElementById('btn-refresh-logs');

  // KPI elements
  const kpiScore = document.getElementById('kpi-score');
  const complianceBar = document.getElementById('compliance-bar');
  const complianceStatusBadge = document.getElementById('compliance-status-badge');
  const kpiRulesSummary = document.getElementById('kpi-rules-summary');
  const kpiPods = document.getElementById('kpi-pods');
  const podStatusBadge = document.getElementById('pod-status-badge');
  const kpiUptime = document.getElementById('kpi-uptime');
  const kpiMem = document.getElementById('kpi-mem');
  const kpiLatencyVal = document.getElementById('kpi-latency-val');
  const kpiRequests = document.getElementById('kpi-requests');
  const sparklineContainer = document.getElementById('sparkline');
  const kpiImageTag = document.getElementById('kpi-image-tag');
  const kpiGitSha = document.getElementById('kpi-git-sha');
  const kpiBuildId = document.getElementById('kpi-build-id');

  // Gauge elements
  const cpuGauge = document.getElementById('cpu-gauge');
  const cpuPercent = document.getElementById('cpu-percent');
  const cpuStatusCaption = document.getElementById('cpu-status-caption');
  const memGauge = document.getElementById('mem-gauge');
  const memPercent = document.getElementById('mem-percent');

  // Table elements
  const complianceTableBody = document.getElementById('compliance-table-body');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const logTerminalOutput = document.getElementById('log-terminal-output');

  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');
    });
  });

  // Table Filters
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      fetchComplianceData();
    });
  });

  // Render Sparkline
  function renderSparkline() {
    sparklineContainer.innerHTML = '';
    const maxVal = Math.max(...latencyHistory, 50);
    latencyHistory.slice(-12).forEach(val => {
      const bar = document.createElement('div');
      bar.className = 'spark-bar' + (val > 100 ? ' spike' : '');
      const heightPercent = Math.min(100, Math.max(15, (val / maxVal) * 100));
      bar.style.height = `${heightPercent}%`;
      bar.title = `${val}ms`;
      sparklineContainer.appendChild(bar);
    });
  }

  // Format uptime
  function formatUptime(seconds) {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    if (mins > 0) return `${mins}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Fetch Metrics & Telemetry
  async function fetchMetrics() {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) return;
      const data = await res.json();

      // Latency update
      const latency = data.telemetry.latencyMs;
      latencyHistory.push(latency);
      if (latencyHistory.length > 20) latencyHistory.shift();
      kpiLatencyVal.textContent = `${latency}ms`;
      renderSparkline();

      // Counts & Uptime
      kpiRequests.textContent = data.requestCount.toLocaleString();
      kpiUptime.textContent = formatUptime(data.uptimeSeconds);
      kpiMem.textContent = `${data.telemetry.memoryRssMb} MB`;
      kpiPods.textContent = data.telemetry.activePods.split(' ')[0];

      // Pod health badge
      if (data.telemetry.activePods.includes('3/3')) {
        podStatusBadge.className = 'kpi-tag success';
        podStatusBadge.textContent = 'HEALTHY';
      } else {
        podStatusBadge.className = 'kpi-tag warning';
        podStatusBadge.textContent = 'DEGRADED';
      }

      // CI/CD meta
      kpiImageTag.textContent = data.ciCdMetadata.imageTag;
      kpiGitSha.textContent = data.ciCdMetadata.gitCommitSha;
      kpiBuildId.textContent = `#${data.ciCdMetadata.workflowRunId}`;

      // CPU Gauge
      const cpu = data.telemetry.cpuUsagePercent;
      cpuGauge.style.setProperty('--val', cpu);
      cpuPercent.textContent = `${cpu}%`;
      if (cpu > 70) {
        cpuGauge.style.background = `conic-gradient(#EF4444 calc(${cpu} * 1%), #222733 0)`;
        cpuStatusCaption.textContent = '⚠️ Elevated Compute Threshold';
      } else {
        cpuGauge.style.background = `conic-gradient(var(--ey-yellow) calc(${cpu} * 1%), #222733 0)`;
        cpuStatusCaption.textContent = 'Normal Workload Allocation';
      }

      // Memory Gauge
      const memEst = Math.min(100, Math.round((data.telemetry.memoryRssMb / 250) * 100));
      memGauge.style.setProperty('--val', memEst);
      memPercent.textContent = `${memEst}%`;

      // Incident state sync
      updateIncidentUI(data.incidentSimulationActive);
    } catch (err) {
      console.warn('Metrics polling error:', err);
    }
  }

  // Fetch Compliance Rules
  async function fetchComplianceData() {
    try {
      const res = await fetch('/api/compliance');
      if (!res.ok) return;
      const data = await res.json();

      kpiScore.textContent = `${data.score}%`;
      complianceBar.style.width = `${data.score}%`;

      if (data.score >= 90) {
        complianceStatusBadge.className = 'kpi-tag success';
        complianceStatusBadge.textContent = 'OPTIMAL';
      } else {
        complianceStatusBadge.className = 'kpi-tag warning';
        complianceStatusBadge.textContent = 'ATTENTION';
      }

      kpiRulesSummary.textContent = `${data.passedRules} of ${data.totalRules} regulatory controls verified`;

      // Filter rules
      let rulesToShow = data.rules;
      if (currentFilter !== 'all') {
        rulesToShow = rulesToShow.filter(r => r.framework.toLowerCase().includes(currentFilter.toLowerCase()));
      }

      // Populate table
      complianceTableBody.innerHTML = '';
      rulesToShow.forEach(rule => {
        const tr = document.createElement('tr');
        
        const statusBadgeClass = rule.status === 'PASS' ? 'pass' : rule.status === 'WARNING' ? 'warning' : 'fail';
        const severityClass = rule.severity.toLowerCase();

        tr.innerHTML = `
          <td><strong>${rule.id}</strong></td>
          <td><span class="badge-code">${rule.framework}</span></td>
          <td>${rule.title}</td>
          <td>${rule.category}</td>
          <td><span class="severity-pill ${severityClass}">${rule.severity}</span></td>
          <td><span class="status-badge ${statusBadgeClass}">${rule.status === 'PASS' ? '✓ PASS' : '⚠️ ' + rule.status}</span></td>
          <td style="color: var(--text-secondary);">${rule.description}</td>
        `;
        complianceTableBody.appendChild(tr);
      });
    } catch (err) {
      console.warn('Compliance polling error:', err);
    }
  }

  // Fetch Audit Logs
  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) return;
      const data = await res.json();

      logTerminalOutput.innerHTML = '';
      data.logs.forEach(log => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const isIncident = log.event.includes('INCIDENT');
        const formattedTime = new Date(log.timestamp).toLocaleTimeString();

        entry.innerHTML = `
          <span class="log-time">[${formattedTime}]</span>
          <span class="log-actor">[${log.actor}]</span>
          <span class="log-event ${isIncident ? 'incident' : ''}">&gt; ${log.event}:</span>
          <span class="log-msg">${log.details}</span>
        `;
        logTerminalOutput.appendChild(entry);
      });
    } catch (err) {
      console.warn('Log polling error:', err);
    }
  }

  // Update Incident UI
  function updateIncidentUI(active) {
    isIncidentActive = active;
    if (active) {
      incidentBanner.classList.remove('hidden');
      btnChaosToggle.classList.add('active-chaos');
      chaosBtnText.textContent = 'Incident Active (Reset)';
    } else {
      incidentBanner.classList.add('hidden');
      btnChaosToggle.classList.remove('active-chaos');
      chaosBtnText.textContent = 'Simulate Incident';
    }
  }

  // Trigger Incident Toggle
  async function toggleIncident(activeState) {
    try {
      const res = await fetch('/api/simulate/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: activeState })
      });
      const data = await res.json();
      updateIncidentUI(data.incidentActive);
      fetchMetrics();
      fetchComplianceData();
      fetchLogs();
    } catch (err) {
      console.error('Failed to toggle incident:', err);
    }
  }

  // Manual Audit Trigger
  async function triggerManualAudit() {
    btnRunAudit.disabled = true;
    btnRunAudit.innerHTML = 'Verifying Controls...';
    try {
      const res = await fetch('/api/audit/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'EY IT Engineering Lead' })
      });
      await res.json();
      await fetchComplianceData();
      await fetchLogs();
      // Show brief success feedback
      btnRunAudit.innerHTML = '✓ Audit Completed';
      setTimeout(() => {
        btnRunAudit.disabled = false;
        btnRunAudit.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Run Compliance Audit
        `;
      }, 1500);
    } catch (err) {
      btnRunAudit.disabled = false;
      btnRunAudit.innerHTML = 'Run Compliance Audit';
    }
  }

  // Event Listeners
  btnRunAudit.addEventListener('click', triggerManualAudit);
  btnChaosToggle.addEventListener('click', () => toggleIncident(!isIncidentActive));
  btnBannerResolve.addEventListener('click', () => toggleIncident(false));
  btnTriggerChaosAction.addEventListener('click', () => toggleIncident(true));
  btnResolveChaosAction.addEventListener('click', () => toggleIncident(false));
  btnRefreshLogs.addEventListener('click', fetchLogs);

  // Initial loads
  fetchMetrics();
  fetchComplianceData();
  fetchLogs();

  // Polling intervals
  setInterval(fetchMetrics, 2500);
  setInterval(fetchComplianceData, 6000);
  setInterval(fetchLogs, 5000);
});
