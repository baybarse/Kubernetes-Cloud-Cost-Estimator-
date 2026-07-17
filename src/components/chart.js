// ─── Chart Component ──────────────────────────────────────────────────────────
import { Chart, registerables } from 'chart.js';
import { PROVIDERS } from '../utils/constants.js';
import { convertFromUSD } from '../core/currency.js';
import { formatCurrency } from '../utils/formatters.js';

Chart.register(...registerables);

// Store chart instances for cleanup
let comparisonChart = null;
let breakdownChart = null;

/**
 * Render provider comparison bar chart.
 */
export function renderComparisonChart(results, options = {}) {
  const { currency = 'USD', period = 'monthly' } = options;
  const canvas = document.getElementById('comparison-chart');
  if (!canvas || !results || results.workloads.length === 0) return;

  // Destroy existing chart
  if (comparisonChart) {
    comparisonChart.destroy();
    comparisonChart = null;
  }

  const ctx = canvas.getContext('2d');
  const providers = ['aws', 'azure', 'gcp'];
  const values = providers.map(p => convertFromUSD(results.totals[p][period], currency));
  const colors = providers.map(p => PROVIDERS[p].color);
  const borderColors = colors.map(c => c + '99');

  comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: providers.map(p => PROVIDERS[p].short),
      datasets: [{
        label: `Cost (${period})`,
        data: values,
        backgroundColor: colors.map(c => c + '40'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 26, 0.9)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx) => formatCurrency(ctx.parsed.y, currency),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Inter' } },
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter' },
            callback: (value) => formatCurrency(value, currency, 0),
          },
        },
      },
    },
  });
}

/**
 * Render workload breakdown doughnut chart.
 */
export function renderBreakdownChart(results, options = {}) {
  const { currency = 'USD', period = 'monthly', provider = 'aws' } = options;
  const canvas = document.getElementById('breakdown-chart');
  if (!canvas || !results || results.workloads.length === 0) return;

  if (breakdownChart) {
    breakdownChart.destroy();
    breakdownChart = null;
  }

  const ctx = canvas.getContext('2d');

  const labels = results.workloads.map(w => w.name);
  const values = results.workloads.map(w =>
    convertFromUSD(w.costs[provider][period], currency)
  );

  const palette = [
    '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
    '#818cf8', '#4f46e5', '#7c3aed', '#6d28d9',
    '#5b21b6', '#4c1d95',
  ];

  breakdownChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderColor: 'rgba(10, 10, 26, 0.8)',
        borderWidth: 3,
        hoverOffset: 10,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 26, 0.9)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed, currency)}`,
          },
        },
      },
    },
  });
}

/**
 * Destroy all charts (cleanup).
 */
export function destroyCharts() {
  if (comparisonChart) { comparisonChart.destroy(); comparisonChart = null; }
  if (breakdownChart) { breakdownChart.destroy(); breakdownChart = null; }
}
