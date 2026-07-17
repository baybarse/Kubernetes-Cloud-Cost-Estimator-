// ─── Currency Converter ───────────────────────────────────────────────────────
const FRANKFURTER_API = 'https://api.frankfurter.app/latest?from=USD';
const CACHE_KEY = 'k8s_cost_exchange_rates';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fallback exchange rates (approximate, updated periodically)
const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  TRY: 34.50,
  JPY: 157.0,
  CAD: 1.37,
  AUD: 1.55,
  INR: 83.50,
  BRL: 5.05,
};

let currentRates = { ...FALLBACK_RATES };
let ratesLoaded = false;

/**
 * Load exchange rates from Frankfurter API.
 */
export async function loadExchangeRates() {
  // Check cache first
  const cached = getCachedRates();
  if (cached) {
    currentRates = { USD: 1, ...cached };
    ratesLoaded = true;
    return currentRates;
  }

  try {
    const response = await fetch(FRANKFURTER_API);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    currentRates = { USD: 1, ...data.rates };
    ratesLoaded = true;

    // Cache the rates
    setCachedRates(data.rates);

    return currentRates;
  } catch (error) {
    console.warn('Failed to fetch exchange rates, using fallback:', error.message);
    currentRates = { ...FALLBACK_RATES };
    ratesLoaded = true;
    return currentRates;
  }
}

/**
 * Convert an amount from USD to the target currency.
 */
export function convertFromUSD(amountUSD, targetCurrency = 'USD') {
  if (targetCurrency === 'USD') return amountUSD;
  const rate = currentRates[targetCurrency];
  if (!rate) {
    console.warn(`No exchange rate for ${targetCurrency}, returning USD`);
    return amountUSD;
  }
  return amountUSD * rate;
}

/**
 * Get the current exchange rate for a currency.
 */
export function getRate(currency) {
  return currentRates[currency] || 1;
}

/**
 * Check if rates have been loaded.
 */
export function isRatesLoaded() {
  return ratesLoaded;
}

/**
 * Get all available currencies.
 */
export function getAvailableCurrencies() {
  return Object.keys(currentRates);
}

// ─── Cache Helpers ───────────────────────────────────────────────────────────
function getCachedRates() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { rates, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return rates;
  } catch {
    return null;
  }
}

function setCachedRates(rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage may not be available
  }
}
