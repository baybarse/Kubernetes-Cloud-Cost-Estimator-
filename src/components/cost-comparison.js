// ─── Cost Comparison Component ────────────────────────────────────────────────
import { formatCurrency } from '../utils/formatters.js';
import { PROVIDERS, HOURS_PER_DAY, HOURS_PER_MONTH, MONTHS_PER_YEAR } from '../utils/constants.js';
import { convertFromUSD } from '../core/currency.js';

/**
 * Render the detailed cost comparison table.
 */
export function renderCostComparison(results, options = {}) {
  const { currency = 'USD' } = options;
  const container = document.getElementById('comparison-container');
  if (!container || !results || results.workloads.length === 0) {
    if (container) container.innerHTML = '';
    return;
  }

  const providers = ['aws', 'azure', 'gcp'];
  const cheapest = results.cheapestProvider;

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Period</th>
          ${providers.map(p => `
            <th style="color:var(--${p}-color)">
              ${PROVIDERS[p].icon} ${PROVIDERS[p].short}
              ${p === cheapest ? ' ⭐' : ''}
            </th>
          `).join('')}
          <th>Savings vs Best</th>
        </tr>
      </thead>
      <tbody>
        ${renderPeriodRow('Hourly', 'hourly', results, providers, currency, cheapest)}
        ${renderPeriodRow('Daily', 'daily', results, providers, currency, cheapest)}
        ${renderPeriodRow('Monthly', 'monthly', results, providers, currency, cheapest)}
        ${renderPeriodRow('Yearly', 'yearly', results, providers, currency, cheapest)}
      </tbody>
    </table>

    <div style="margin-top:var(--space-md);font-size:var(--font-size-xs);color:var(--text-tertiary);">
      * Includes cluster management fees. Based on ${results.totalResources.replicas} replica(s), 
      ${results.totalResources.cpu.toFixed(1)} total vCPU, ${results.totalResources.memory.toFixed(1)} GiB memory.
    </div>
  `;
}

function renderPeriodRow(label, key, results, providers, currency, cheapest) {
  const values = providers.map(p => convertFromUSD(results.totals[p][key], currency));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const savings = maxValue > 0 ? ((maxValue - minValue) / maxValue * 100).toFixed(0) : 0;

  return `
    <tr>
      <td><strong>${label}</strong></td>
      ${providers.map((p, i) => {
        const isCheapest = values[i] === minValue;
        return `
          <td class="cost-cell" style="color:var(--${p}-color);${isCheapest ? 'font-weight:800;' : ''}">
            ${formatCurrency(values[i], currency)}
            ${isCheapest ? ' <span class="badge badge-success" style="margin-left:4px">Lowest</span>' : ''}
          </td>
        `;
      }).join('')}
      <td>
        <span class="badge badge-info">Up to ${savings}%</span>
      </td>
    </tr>
  `;
}
