// ─── Fetch Azure Pricing ──────────────────────────────────────────────────────
// Fetches VM pricing from Azure Retail Prices API (public, no auth needed).

const REGIONS = ['eastus', 'westeurope', 'southeastasia', 'centralus', 'northeurope', 'japaneast'];

const REGION_NAMES = {
  'eastus': 'East US',
  'westeurope': 'West Europe',
  'southeastasia': 'Southeast Asia',
  'centralus': 'Central US',
  'northeurope': 'North Europe',
  'japaneast': 'Japan East',
};

const FAMILY_MAPPING = {
  general_purpose: ['Standard_D', 'Standard_Ds'],
  compute_optimized: ['Standard_F'],
  memory_optimized: ['Standard_E', 'Standard_Es'],
};

const BASE_URL = 'https://prices.azure.com/api/retail/prices';

export async function fetchAzurePricing() {
  console.log('📦 Fetching Azure pricing data...');

  const result = {
    provider: 'azure',
    lastUpdated: new Date().toISOString(),
    regions: {},
    managementFee: { aksPerHour: 0.0 },
  };

  for (const region of REGIONS) {
    console.log(`  → Fetching ${region}...`);
    try {
      const regionData = await fetchRegionPricing(region);
      result.regions[region] = {
        displayName: REGION_NAMES[region] || region,
        instanceFamilies: regionData,
        discounts: {
          reserved_1yr: 0.38,
          reserved_3yr: 0.57,
          spot_average: 0.68,
        },
      };
      console.log(`  ✓ ${region}: OK`);
    } catch (error) {
      console.error(`  ✗ ${region}: ${error.message}`);
      result.regions[region] = getFallbackRegion(region);
    }
  }

  return result;
}

async function fetchRegionPricing(region) {
  const filter = `serviceName eq 'Virtual Machines' and armRegionName eq '${region}' and priceType eq 'Consumption'`;
  let url = `${BASE_URL}?$filter=${encodeURIComponent(filter)}`;

  const items = [];
  let pageCount = 0;
  const MAX_PAGES = 10;

  while (url && pageCount < MAX_PAGES) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    items.push(...(data.Items || []));

    url = data.NextPageLink || null;
    pageCount++;
  }

  return processAzureData(items);
}

function processAzureData(items) {
  const families = {};

  // Filter for Linux VMs only
  const linuxItems = items.filter(item =>
    !item.productName?.includes('Windows') &&
    !item.productName?.includes('Red Hat') &&
    !item.productName?.includes('SUSE') &&
    !item.meterName?.includes('Low Priority') &&
    !item.meterName?.includes('Spot') &&
    item.unitPrice > 0 &&
    item.unitOfMeasure === '1 Hour'
  );

  for (const [familyKey, prefixes] of Object.entries(FAMILY_MAPPING)) {
    const matchingItems = linuxItems.filter(item => {
      const sku = item.armSkuName || '';
      return prefixes.some(p => sku.startsWith(p));
    });

    if (matchingItems.length > 0) {
      // Extract vCPU and memory from SKU name (approximate)
      let totalCpuRate = 0;
      let totalMemRate = 0;
      let count = 0;

      for (const item of matchingItems) {
        const vcpu = estimateVCPU(item.armSkuName);
        const memory = estimateMemory(item.armSkuName, familyKey);
        if (!vcpu || !memory) continue;

        totalCpuRate += item.unitPrice / vcpu;
        totalMemRate += item.unitPrice / memory;
        count++;
      }

      if (count > 0) {
        families[familyKey] = {
          perVCpuHour: Math.round((totalCpuRate / count) * 10000) / 10000,
          perGiBHour: Math.round((totalMemRate / count) * 10000) / 10000,
          itemCount: count,
        };
      }
    }
  }

  if (Object.keys(families).length === 0) {
    return {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006 },
      compute_optimized: { perVCpuHour: 0.042, perGiBHour: 0.0053 },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048 },
    };
  }

  return families;
}

function estimateVCPU(skuName) {
  if (!skuName) return null;
  const sizeMatch = skuName.match(/(\d+)/);
  if (!sizeMatch) return null;
  const size = parseInt(sizeMatch[1], 10);
  // Azure D-series: D2 = 2 vCPU, D4 = 4 vCPU, etc.
  return size;
}

function estimateMemory(skuName, family) {
  const vcpu = estimateVCPU(skuName);
  if (!vcpu) return null;
  // Approximate memory ratios per family
  const ratios = {
    general_purpose: 4,   // 4 GiB per vCPU
    compute_optimized: 2, // 2 GiB per vCPU
    memory_optimized: 8,  // 8 GiB per vCPU
  };
  return vcpu * (ratios[family] || 4);
}

function getFallbackRegion(region) {
  return {
    displayName: REGION_NAMES[region] || region,
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006 },
      compute_optimized: { perVCpuHour: 0.042, perGiBHour: 0.0053 },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048 },
    },
    discounts: { reserved_1yr: 0.38, reserved_3yr: 0.57, spot_average: 0.68 },
  };
}
