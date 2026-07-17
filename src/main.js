// ─── K8s Cost Estimator — Main Entry Point ────────────────────────────────────
import './styles/index.css';
import './styles/components.css';
import './styles/animations.css';

import jsYaml from 'js-yaml';
import { parseYAML } from './core/yaml-parser.js';
import { calculateCosts, findCheapestRegions } from './core/cost-calculator.js';
import { loadExchangeRates } from './core/currency.js';
import { analyzeWorkloads } from './core/optimizer.js';

import { initFileUpload } from './components/file-upload.js';
import { initYAMLEditor } from './components/yaml-editor.js';
import { renderResults } from './components/results-panel.js';
import { renderCostComparison } from './components/cost-comparison.js';
import { renderOptimizations } from './components/optimization-panel.js';
import { initSettings } from './components/settings-panel.js';
import { renderComparisonChart, renderBreakdownChart } from './components/chart.js';
import { renderRegionOptimizer } from './components/region-optimizer.js';
import { formatRelativeTime } from './utils/formatters.js';

// ─── App State ───────────────────────────────────────────────────────────────
let currentYAML = '';
let currentResults = null;
let currentAnalysis = null;
let currentRegionData = null;
let currentWorkloads = null;
let settings = null;

// Expose js-yaml globally for the YAML editor validation
window.__jsYaml = jsYaml;

// ─── Initialize ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Init settings
  settings = initSettings(onSettingsChange);

  // Init file upload
  initFileUpload(onYAMLLoaded);

  // Init YAML editor
  const editor = initYAMLEditor(onYAMLEdited);

  // Analyze button
  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', runAnalysis);
  }

  // Chart tabs
  document.querySelectorAll('[data-chart-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-chart-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const targetId = `chart-${tab.dataset.chartTab}`;
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  // Load exchange rates
  try {
    await loadExchangeRates();
  } catch (e) {
    console.warn('Exchange rates loading failed:', e);
  }

  // Load pricing freshness
  loadPricingFreshness();
});

// ─── Event Handlers ──────────────────────────────────────────────────────────
function onYAMLLoaded(yamlString) {
  currentYAML = yamlString;
  // Auto-fill editor if it was empty
  const textarea = document.getElementById('yaml-textarea');
  if (textarea && !textarea.value.trim() && yamlString) {
    textarea.value = yamlString;
  }
}

function onYAMLEdited(yamlString) {
  currentYAML = yamlString;
}

function onSettingsChange(newSettings) {
  settings = newSettings;
  // Re-render if we have results
  if (currentResults) {
    // Recalculate costs with new settings
    if (currentWorkloads) {
      currentResults = calculateCosts(currentWorkloads, {
        region: settings.regions,
        instanceFamily: settings.instanceFamily,
        pricingModel: settings.pricingModel,
        daemonSetNodes: settings.daemonSetNodes,
      });

      currentRegionData = findCheapestRegions(currentWorkloads, {
        instanceFamily: settings.instanceFamily,
        pricingModel: settings.pricingModel,
        daemonSetNodes: settings.daemonSetNodes,
      });
    }
    renderAllResults();
  }
}

/**
 * Apply a region from the Region Optimizer.
 * Updates the settings dropdown and re-runs analysis.
 */
function applyRegion(provider, region) {
  // Update the region select dropdown
  const regionSelect = document.getElementById(`${provider}-region-select`);
  if (regionSelect) {
    regionSelect.value = region;
    // Trigger change event
    regionSelect.dispatchEvent(new Event('change'));
  }

  // Flash the settings bar to draw attention
  const settingsBar = document.getElementById('settings-bar');
  if (settingsBar) {
    settingsBar.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.3)';
    settingsBar.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    setTimeout(() => {
      settingsBar.style.boxShadow = '';
      settingsBar.style.borderColor = '';
    }, 1500);
  }

  // Scroll to results
  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Analysis ────────────────────────────────────────────────────────────────
function runAnalysis() {
  const errorEl = document.getElementById('analyze-error');

  // Get YAML from editor (priority) or file upload
  const textarea = document.getElementById('yaml-textarea');
  const yamlString = textarea?.value || currentYAML;

  if (!yamlString || !yamlString.trim()) {
    showError('Please upload a YAML file or paste a manifest in the editor.');
    return;
  }

  // Parse YAML
  const { workloads, errors } = parseYAML(yamlString);

  if (errors.length > 0) {
    showError(errors.join('\n'));
    return;
  }

  if (workloads.length === 0) {
    showError('No Kubernetes workloads found. Supported: Deployment, StatefulSet, DaemonSet, Job, CronJob, Pod.');
    return;
  }

  // Hide errors
  if (errorEl) {
    errorEl.style.display = 'none';
  }

  // Store workloads for re-calculation
  currentWorkloads = workloads;

  // Calculate costs
  currentResults = calculateCosts(workloads, {
    region: settings.regions,
    instanceFamily: settings.instanceFamily,
    pricingModel: settings.pricingModel,
    daemonSetNodes: settings.daemonSetNodes,
  });

  // Find cheapest regions across all providers
  currentRegionData = findCheapestRegions(workloads, {
    instanceFamily: settings.instanceFamily,
    pricingModel: settings.pricingModel,
    daemonSetNodes: settings.daemonSetNodes,
  });

  // Analyze for optimizations
  currentAnalysis = analyzeWorkloads(workloads);

  // Show results
  renderAllResults();

  // Show result sections with animation
  const sections = ['results-section', 'bottom-section', 'region-optimizer-section', 'optimization-section'];
  sections.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = '';
      el.classList.add('animate-fade-in-up');
      el.style.animationDelay = `${i * 0.1}s`;
    }
  });

  // Scroll to results
  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAllResults() {
  if (!currentResults) return;

  const opts = {
    currency: settings.currency,
    period: settings.period,
  };

  renderResults(currentResults, opts);
  renderCostComparison(currentResults, opts);
  renderComparisonChart(currentResults, opts);
  renderBreakdownChart(currentResults, { ...opts, provider: currentResults.cheapestProvider || 'aws' });
  renderOptimizations(currentAnalysis);

  // Render region optimizer
  if (currentRegionData) {
    renderRegionOptimizer(currentRegionData, {
      ...opts,
      onApplyRegion: applyRegion,
    });
  }
}

function showError(msg) {
  const errorEl = document.getElementById('analyze-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

// ─── Pricing Freshness ───────────────────────────────────────────────────────
async function loadPricingFreshness() {
  const el = document.getElementById('pricing-freshness');
  if (!el) return;

  try {
    const metadata = (await import('./data/pricing/metadata.json')).default;

    const lastUpdated = metadata.lastUpdated;
    const daysSince = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));

    let statusClass = 'fresh';
    let statusIcon = '✅';
    if (daysSince > 90) { statusClass = 'outdated'; statusIcon = '🔴'; }
    else if (daysSince > 30) { statusClass = 'stale'; statusIcon = '⚠️'; }

    el.className = `pricing-freshness ${statusClass}`;
    el.innerHTML = `${statusIcon} <span>Prices updated ${formatRelativeTime(lastUpdated)}</span>`;
    el.title = `Source: ${metadata.source || 'API'} | Last: ${new Date(lastUpdated).toLocaleDateString()}`;
  } catch {
    el.className = 'pricing-freshness fresh';
    el.innerHTML = '✅ <span>Using reference prices</span>';
    el.title = 'Pricing based on public reference rates';
  }
}
