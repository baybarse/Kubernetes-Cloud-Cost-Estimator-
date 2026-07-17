// ─── Region Optimizer Component ───────────────────────────────────────────────
import { formatCurrency, formatPercent } from '../utils/formatters.js';
import { PROVIDERS } from '../utils/constants.js';
import { convertFromUSD } from '../core/currency.js';

/**
 * Render the region optimization panel showing cheapest regions per provider
 * and the absolute cheapest provider+region combo.
 */
export function renderRegionOptimizer(regionData, options = {}) {
  const { currency = 'USD', period = 'monthly', onApplyRegion } = options;
  const container = document.getElementById('region-optimizer-container');
  if (!container) return;

  if (!regionData || regionData.allResults.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-xl)">
        <div class="empty-icon">🌍</div>
        <div class="empty-title">No Data</div>
        <div class="empty-text">Run analysis first to see region optimization.</div>
      </div>
    `;
    return;
  }

  const periodKey = period;
  const { absoluteCheapest, perProvider, allResults } = regionData;

  container.innerHTML = `
    <!-- Absolute Cheapest Banner -->
    <div class="cheapest-banner animate-fade-in">
      <div class="cheapest-banner-icon">🏆</div>
      <div class="cheapest-banner-content">
        <div class="cheapest-banner-label">Absolute Cheapest Option</div>
        <div class="cheapest-banner-value">
          <span style="color:var(--${absoluteCheapest.provider}-color);font-weight:800;">
            ${PROVIDERS[absoluteCheapest.provider].short}
          </span>
          <span style="color:var(--text-secondary);margin:0 6px;">→</span>
          <span style="font-weight:600;">${absoluteCheapest.regionName}</span>
        </div>
        <div class="cheapest-banner-cost">
          ${formatCurrency(convertFromUSD(absoluteCheapest[periodKey], currency), currency)}
          <span style="color:var(--text-tertiary);font-weight:400;font-size:0.85em;">/ ${period}</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm apply-cheapest-btn" data-provider="${absoluteCheapest.provider}" data-region="${absoluteCheapest.region}">
        ✓ Apply
      </button>
    </div>

    <!-- Per-Provider Rankings -->
    <div class="region-rankings">
      ${['aws', 'azure', 'gcp'].map(provider => renderProviderRanking(
        provider, perProvider[provider], currency, periodKey, period
      )).join('')}
    </div>

    <!-- Global Top 5 -->
    <div class="global-ranking" style="margin-top:var(--space-lg);">
      <h4 style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--space-sm);">
        🌐 Global Top 5 Cheapest (All Providers)
      </h4>
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Provider</th>
            <th>Region</th>
            <th>Monthly</th>
            <th>Yearly</th>
            <th>vs Most Expensive</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${allResults.slice(0, 5).map((entry, i) => `
            <tr class="${i === 0 ? 'best-row' : ''}">
              <td style="font-weight:700;color:${i === 0 ? 'var(--severity-success)' : 'var(--text-tertiary)'}">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </td>
              <td style="color:var(--${entry.provider}-color);font-weight:600;">
                ${PROVIDERS[entry.provider].short}
              </td>
              <td>${entry.regionName}</td>
              <td class="cost-cell">${formatCurrency(convertFromUSD(entry.monthly, currency), currency)}</td>
              <td class="cost-cell" style="color:var(--text-secondary);">${formatCurrency(convertFromUSD(entry.yearly, currency), currency)}</td>
              <td>
                ${entry.savingsVsGlobalMax > 0
                  ? `<span class="badge badge-success">Save ${formatPercent(entry.savingsVsGlobalMax)}</span>`
                  : '<span class="badge badge-warning">Most Expensive</span>'}
              </td>
              <td>
                <button class="btn btn-sm apply-region-btn" data-provider="${entry.provider}" data-region="${entry.region}" title="Apply this region">
                  Apply
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Bind apply buttons
  container.querySelectorAll('.apply-region-btn, .apply-cheapest-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider;
      const region = btn.dataset.region;
      if (onApplyRegion) {
        onApplyRegion(provider, region);
      }
    });
  });
}

function renderProviderRanking(provider, regions, currency, periodKey, periodLabel) {
  if (!regions || regions.length === 0) return '';

  const cheapest = regions[0];
  const expensive = regions[regions.length - 1];
  const providerInfo = PROVIDERS[provider];

  return `
    <div class="provider-ranking card" style="padding:var(--space-md);">
      <div class="provider-ranking-header">
        <span style="color:var(--${provider}-color);font-weight:700;font-size:var(--font-size-sm);">
          ${providerInfo.icon} ${providerInfo.short} Regions
        </span>
        <span class="badge badge-success" style="font-size:0.65rem;">
          Best: ${cheapest.regionName}
        </span>
      </div>
      <div class="region-bars">
        ${regions.map((entry, i) => {
          const maxMonthly = expensive.monthly;
          const barWidth = maxMonthly > 0 ? (entry.monthly / maxMonthly) * 100 : 100;
          const isCheapest = i === 0;

          return `
            <div class="region-bar-row ${isCheapest ? 'cheapest' : ''}" 
                 data-provider="${provider}" data-region="${entry.region}">
              <span class="region-bar-name" title="${entry.region}">
                ${isCheapest ? '⭐ ' : ''}${entry.regionName}
              </span>
              <div class="region-bar-track">
                <div class="region-bar-fill" style="width:${barWidth}%;background:var(--${provider}-color);opacity:${isCheapest ? 1 : 0.5};"></div>
              </div>
              <span class="region-bar-cost">
                ${formatCurrency(convertFromUSD(entry[periodKey], currency), currency)}
              </span>
              <button class="btn btn-sm apply-region-btn" data-provider="${provider}" data-region="${entry.region}" 
                      style="padding:2px 8px;font-size:0.65rem;" title="Use this region">
                Use
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
