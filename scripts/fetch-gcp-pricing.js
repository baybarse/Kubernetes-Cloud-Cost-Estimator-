// ─── Fetch GCP Pricing ────────────────────────────────────────────────────────
// Fetches Compute Engine pricing from GCP Cloud Billing Catalog API.

const REGIONS = ['us-central1', 'us-east1', 'europe-west1', 'europe-west4', 'asia-east1', 'asia-northeast1'];

const REGION_NAMES = {
  'us-central1': 'Iowa (us-central1)',
  'us-east1': 'South Carolina (us-east1)',
  'europe-west1': 'Belgium (europe-west1)',
  'europe-west4': 'Netherlands (europe-west4)',
  'asia-east1': 'Taiwan (asia-east1)',
  'asia-northeast1': 'Tokyo (asia-northeast1)',
};

const COMPUTE_SERVICE_ID = '6F81-5844-456A';
const BASE_URL = `https://cloudbilling.googleapis.com/v1/services/${COMPUTE_SERVICE_ID}/skus`;

export async function fetchGCPPricing() {
  console.log('📦 Fetching GCP pricing data...');

  const result = {
    provider: 'gcp',
    lastUpdated: new Date().toISOString(),
    regions: {},
    managementFee: { gkePerHour: 0.10 },
  };

  try {
    const skus = await fetchAllSKUs();
    console.log(`  → Fetched ${skus.length} SKUs total`);

    for (const region of REGIONS) {
      console.log(`  → Processing ${region}...`);
      try {
        const regionData = processRegionSKUs(skus, region);
        result.regions[region] = {
          displayName: REGION_NAMES[region] || region,
          instanceFamilies: regionData,
          discounts: {
            reserved_1yr: 0.37,
            reserved_3yr: 0.55,
            spot_average: 0.70,
          },
        };
        console.log(`  ✓ ${region}: OK`);
      } catch (error) {
        console.error(`  ✗ ${region}: ${error.message}`);
        result.regions[region] = getFallbackRegion(region);
      }
    }
  } catch (error) {
    console.error(`  ✗ Failed to fetch SKUs: ${error.message}`);
    // Use fallback for all regions
    for (const region of REGIONS) {
      result.regions[region] = getFallbackRegion(region);
    }
  }

  return result;
}

async function fetchAllSKUs() {
  const skus = [];
  let nextPageToken = '';
  let pageCount = 0;
  const MAX_PAGES = 20;

  do {
    const url = nextPageToken
      ? `${BASE_URL}?pageToken=${nextPageToken}`
      : BASE_URL;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    skus.push(...(data.skus || []));
    nextPageToken = data.nextPageToken || '';
    pageCount++;
  } while (nextPageToken && pageCount < MAX_PAGES);

  return skus;
}

function processRegionSKUs(skus, region) {
  // Filter for Compute vCPU and RAM SKUs in this region
  const regionSKUs = skus.filter(sku => {
    const regions = sku.serviceRegions || [];
    return regions.some(r => r === region || r === 'global');
  });

  const cpuSKUs = regionSKUs.filter(sku =>
    sku.category?.resourceFamily === 'Compute' &&
    sku.category?.usageType === 'OnDemand' &&
    sku.description?.toLowerCase().includes('cpu')
  );

  const ramSKUs = regionSKUs.filter(sku =>
    sku.category?.resourceFamily === 'Compute' &&
    sku.category?.usageType === 'OnDemand' &&
    sku.description?.toLowerCase().includes('ram')
  );

  // Extract per-vCPU and per-GiB rates
  const cpuRates = extractRates(cpuSKUs);
  const ramRates = extractRates(ramSKUs);

  const avgCpuRate = cpuRates.length > 0 ? cpuRates.reduce((a, b) => a + b, 0) / cpuRates.length : 0.032;
  const avgRamRate = ramRates.length > 0 ? ramRates.reduce((a, b) => a + b, 0) / ramRates.length : 0.0043;

  return {
    general_purpose: {
      perVCpuHour: Math.round(avgCpuRate * 10000) / 10000,
      perGiBHour: Math.round(avgRamRate * 10000) / 10000,
    },
    compute_optimized: {
      perVCpuHour: Math.round(avgCpuRate * 1.05 * 10000) / 10000,
      perGiBHour: Math.round(avgRamRate * 1.1 * 10000) / 10000,
    },
    memory_optimized: {
      perVCpuHour: Math.round(avgCpuRate * 0.95 * 10000) / 10000,
      perGiBHour: Math.round(avgRamRate * 0.95 * 10000) / 10000,
    },
  };
}

function extractRates(skus) {
  const rates = [];

  for (const sku of skus) {
    const pricingInfo = sku.pricingInfo?.[0];
    if (!pricingInfo) continue;

    const tieredRates = pricingInfo.pricingExpression?.tieredRates;
    if (!tieredRates?.length) continue;

    const rate = tieredRates[tieredRates.length - 1];
    const units = parseInt(rate.unitPrice?.units || '0', 10);
    const nanos = parseInt(rate.unitPrice?.nanos || '0', 10);
    const hourlyRate = units + nanos / 1e9;

    if (hourlyRate > 0 && hourlyRate < 1) {
      rates.push(hourlyRate);
    }
  }

  return rates;
}

function getFallbackRegion(region) {
  return {
    displayName: REGION_NAMES[region] || region,
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.032, perGiBHour: 0.0043 },
      compute_optimized: { perVCpuHour: 0.034, perGiBHour: 0.0047 },
      memory_optimized: { perVCpuHour: 0.030, perGiBHour: 0.004 },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.55, spot_average: 0.70 },
  };
}
