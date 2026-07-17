// ─── Settings Panel Component ─────────────────────────────────────────────────
import { CURRENCY_SYMBOLS, CURRENCY_NAMES, PRICING_MODELS, INSTANCE_FAMILIES } from '../utils/constants.js';
import { getAllRegions, DEFAULT_REGIONS } from '../data/regions.js';

/**
 * Initialize settings controls and return current settings.
 * @param {Function} onChange - callback(settings)
 */
export function initSettings(onChange) {
  const settings = {
    currency: 'USD',
    period: 'monthly',
    pricingModel: 'ondemand',
    instanceFamily: 'general_purpose',
    regions: { ...DEFAULT_REGIONS },
    daemonSetNodes: 3,
  };

  const allRegions = getAllRegions();

  // Currency select
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.innerHTML = Object.entries(CURRENCY_NAMES).map(([code, name]) =>
      `<option value="${code}" ${code === settings.currency ? 'selected' : ''}>
        ${CURRENCY_SYMBOLS[code]} ${code} — ${name}
      </option>`
    ).join('');
    currencySelect.addEventListener('change', () => {
      settings.currency = currencySelect.value;
      onChange(settings);
    });
  }

  // Period toggle
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.period = btn.dataset.period;
      onChange(settings);
    });
  });

  // Pricing model toggle
  document.querySelectorAll('[data-pricing-model]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-pricing-model]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.pricingModel = btn.dataset.pricingModel;
      onChange(settings);
    });
  });

  // Instance family select
  const familySelect = document.getElementById('instance-family-select');
  if (familySelect) {
    familySelect.innerHTML = Object.entries(INSTANCE_FAMILIES).map(([id, info]) =>
      `<option value="${id}" ${id === settings.instanceFamily ? 'selected' : ''}>${info.name}</option>`
    ).join('');
    familySelect.addEventListener('change', () => {
      settings.instanceFamily = familySelect.value;
      onChange(settings);
    });
  }

  // Region selects
  for (const provider of ['aws', 'azure', 'gcp']) {
    const regionSelect = document.getElementById(`${provider}-region-select`);
    if (regionSelect) {
      regionSelect.innerHTML = allRegions[provider].map(r =>
        `<option value="${r.id}" ${r.id === settings.regions[provider] ? 'selected' : ''}>${r.name}</option>`
      ).join('');
      regionSelect.addEventListener('change', () => {
        settings.regions[provider] = regionSelect.value;
        onChange(settings);
      });
    }
  }

  // DaemonSet nodes input
  const nodesInput = document.getElementById('daemonset-nodes-input');
  if (nodesInput) {
    nodesInput.value = settings.daemonSetNodes;
    nodesInput.addEventListener('change', () => {
      settings.daemonSetNodes = Math.max(1, parseInt(nodesInput.value, 10) || 3);
      onChange(settings);
    });
  }

  return settings;
}
