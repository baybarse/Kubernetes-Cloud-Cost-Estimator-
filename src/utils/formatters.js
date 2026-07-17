// ─── Number & Currency Formatters ─────────────────────────────────────────────
import { CURRENCY_SYMBOLS } from './constants.js';

/**
 * Format a monetary value with currency symbol and locale formatting.
 */
export function formatCurrency(amount, currency = 'USD', maximumFractionDigits = 2) {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  const maxDigits = Math.max(0, Math.min(20, Math.round(maximumFractionDigits)));
  const minDigits = Math.min(2, maxDigits);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(Math.abs(amount || 0));
  return `${amount < 0 ? '-' : ''}${sym}${formatted}`;
}

/**
 * Format a decimal fraction as a percentage string.
 */
export function formatPercent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Format CPU value in human-readable vCPU units.
 */
export function formatCPU(cpuCores) {
  if (cpuCores < 1) {
    return `${Math.round(cpuCores * 1000)}m`;
  }
  return `${cpuCores} vCPU`;
}

/**
 * Format memory in human-readable units.
 */
export function formatMemory(gib) {
  if (gib < 1) {
    return `${Math.round(gib * 1024)} MiB`;
  }
  return `${gib.toFixed(1)} GiB`;
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(num, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format relative time (e.g., "3 days ago").
 */
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Parse CPU string to number of cores.
 * Examples: "500m" -> 0.5, "1" -> 1, "2000m" -> 2
 */
export function parseCPU(cpuStr) {
  if (typeof cpuStr === 'number') return cpuStr;
  if (!cpuStr) return 0;
  const str = String(cpuStr).trim();
  if (str.endsWith('m')) {
    return parseInt(str, 10) / 1000;
  }
  return parseFloat(str) || 0;
}

/**
 * Parse memory string to GiB.
 * Examples: "128Mi" -> 0.125, "1Gi" -> 1, "256M" -> ~0.238, "1G" -> ~0.931
 */
export function parseMemory(memStr) {
  if (typeof memStr === 'number') return memStr;
  if (!memStr) return 0;
  const str = String(memStr).trim();

  const match = str.match(/^(\d+(?:\.\d+)?)\s*(Ki|Mi|Gi|Ti|Pi|Ei|k|M|G|T|P|E|m)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || '';

  // Binary units (Ki, Mi, Gi, Ti)
  const binaryMap = { 'Ki': 1 / (1024 * 1024), 'Mi': 1 / 1024, 'Gi': 1, 'Ti': 1024, 'Pi': 1024 * 1024, 'Ei': 1024 * 1024 * 1024 };
  // Decimal units (k, M, G, T) — convert to GiB
  const decimalMap = { 'k': 1000 / (1024 ** 3), 'M': 1e6 / (1024 ** 3), 'G': 1e9 / (1024 ** 3), 'T': 1e12 / (1024 ** 3) };

  if (binaryMap[unit] !== undefined) return value * binaryMap[unit];
  if (decimalMap[unit] !== undefined) return value * decimalMap[unit];
  if (unit === 'm') return value / 1000 / (1024 ** 3); // millibytes (rare)

  // No unit = bytes
  return value / (1024 ** 3);
}
