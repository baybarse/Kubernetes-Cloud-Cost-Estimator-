// ─── Results Panel Component ──────────────────────────────────────────────────
import { formatCurrency, formatCPU, formatMemory } from '../utils/formatters.js';
import { PROVIDERS } from '../utils/constants.js';
import { convertFromUSD } from '../core/currency.js';

/**
 * Render the cost results panel.
 */
export function renderResults(results, options = {}) {
  const { currency = 'USD', period = 'monthly' } = options;
  const container = document.getElementById('results-container');
  if (!container) return;

  if (!results || results.workloads.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">No Results Yet</div>
        <div class="empty-text">Upload a Kubernetes YAML manifest or paste one in the editor, then click Analyze to see cost estimates.</div>
      </div>
    `;
    return;
  }

  const periodKey = period;
  const periodLabel = { daily: '/ day', monthly: '/ month', yearly: '/ year' }[period] || '/ month';

  container.innerHTML = `
    <div class="results-header">
      <div class="results-summary">
        <span class="summary-stat">
          <span class="stat-label">Total Resources:</span>
          <span class="stat-value">${formatCPU(results.totalResources.cpu)} CPU, ${formatMemory(results.totalResources.memory)} Memory</span>
        </span>
        <span class="summary-stat">
          <span class="stat-label">Workloads:</span>
          <span class="stat-value">${results.workloads.length}</span>
        </span>
        <span class="summary-stat">
          <span class="stat-label">Total Replicas:</span>
          <span class="stat-value">${results.totalResources.replicas}</span>
        </span>
      </div>
    </div>

    <div class="grid-3 stagger-children" id="provider-cards">
      ${renderProviderCards(results, currency, periodKey, periodLabel)}
    </div>

    <div class="workloads-breakdown" id="workloads-breakdown">
      <h3 class="section-title"><span class="icon">📋</span> Workload Breakdown</h3>
      ${renderWorkloadBreakdown(results, currency, periodKey)}
    </div>

    <div class="export-actions">
      <button class="btn btn-sm" id="export-csv-btn">📥 Export CSV</button>
      <button class="btn btn-sm" id="export-json-btn">📥 Export JSON</button>
    </div>
  `;

  // Bind export buttons
  document.getElementById('export-csv-btn')?.addEventListener('click', () => exportCSV(results, currency, periodKey));
  document.getElementById('export-json-btn')?.addEventListener('click', () => exportJSON(results));
}

function renderProviderCards(results, currency, periodKey, periodLabel) {
  return ['aws', 'azure', 'gcp'].map(provider => {
    const cost = convertFromUSD(results.totals[provider][periodKey], currency);
    const isCheapest = provider === results.cheapestProvider;
    const providerInfo = PROVIDERS[provider];

    return `
      <div class="card provider-card ${provider} hover-lift hover-glow-${provider}">
        <div class="provider-name">${providerInfo.icon} ${providerInfo.short}</div>
        <div class="cost-value cost-animated">${formatCurrency(cost, currency)}</div>
        <div class="cost-period">${periodLabel}</div>
        ${isCheapest ? '<div class="cheapest-badge">✓ Best Price</div>' : ''}
        <div class="provider-detail" style="margin-top:12px;font-size:0.75rem;color:var(--text-tertiary)">
          Mgmt fee: ${formatCurrency(convertFromUSD(results.managementFees[provider], currency), currency)}/mo
        </div>
      </div>
    `;
  }).join('');
}

function renderWorkloadBreakdown(results, currency, periodKey) {
  if (results.workloads.length === 0) return '<div class="no-results">No workloads found</div>';

  return results.workloads.map(w => `
    <div class="workload-card animate-fade-in-up">
      <div class="workload-header">
        <span class="workload-name">${w.name}</span>
        <span class="workload-kind">${w.kind}</span>
      </div>
      <div class="workload-stats">
        <span><span class="stat-label">Replicas:</span> ${w.replicas}</span>
        <span><span class="stat-label">CPU:</span> ${formatCPU(w.totalCPU)}</span>
        <span><span class="stat-label">Memory:</span> ${formatMemory(w.totalMemory)}</span>
        <span><span class="stat-label">Namespace:</span> ${w.namespace}</span>
      </div>
      <div class="workload-costs" style="display:flex;gap:16px;margin-top:8px;font-size:0.8rem;">
        ${['aws', 'azure', 'gcp'].map(p => `
          <span style="color:var(--${p}-color)">
            ${PROVIDERS[p].short}: ${formatCurrency(convertFromUSD(w.costs[p][periodKey], currency), currency)}
          </span>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function exportCSV(results, currency, periodKey) {
  const rows = [['Workload', 'Kind', 'Replicas', 'CPU', 'Memory (GiB)', 'AWS', 'Azure', 'GCP']];

  for (const w of results.workloads) {
    rows.push([
      w.name, w.kind, w.replicas, w.totalCPU.toFixed(2), w.totalMemory.toFixed(2),
      convertFromUSD(w.costs.aws[periodKey], currency).toFixed(2),
      convertFromUSD(w.costs.azure[periodKey], currency).toFixed(2),
      convertFromUSD(w.costs.gcp[periodKey], currency).toFixed(2),
    ]);
  }

  rows.push([
    'TOTAL', '', results.totalResources.replicas,
    results.totalResources.cpu.toFixed(2), results.totalResources.memory.toFixed(2),
    convertFromUSD(results.totals.aws[periodKey], currency).toFixed(2),
    convertFromUSD(results.totals.azure[periodKey], currency).toFixed(2),
    convertFromUSD(results.totals.gcp[periodKey], currency).toFixed(2),
  ]);

  const csv = rows.map(r => r.join(',')).join('\n');
  downloadFile(`k8s-costs-${periodKey}.csv`, csv, 'text/csv');
}

function exportJSON(results) {
  const json = JSON.stringify(results, null, 2);
  downloadFile('k8s-costs.json', json, 'application/json');
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
