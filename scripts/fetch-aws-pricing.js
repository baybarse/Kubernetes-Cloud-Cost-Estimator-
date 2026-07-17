// ─── Fetch AWS Pricing ────────────────────────────────────────────────────────
// Fetches EC2 pricing from AWS Bulk Pricing API (public, no auth needed).

const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'];

const REGION_NAMES = {
  'us-east-1': 'US East (N. Virginia)',
  'us-west-2': 'US West (Oregon)',
  'eu-west-1': 'EU (Ireland)',
  'eu-central-1': 'EU (Frankfurt)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
};

const FAMILY_PREFIXES = {
  general_purpose: ['m5', 'm6i', 'm6g', 'm7i', 'm7g'],
  compute_optimized: ['c5', 'c6i', 'c6g', 'c7i', 'c7g'],
  memory_optimized: ['r5', 'r6i', 'r6g', 'r7i', 'r7g'],
};

export async function fetchAWSPricing() {
  console.log('📦 Fetching AWS pricing data...');

  const result = {
    provider: 'aws',
    lastUpdated: new Date().toISOString(),
    regions: {},
    managementFee: { eksPerHour: 0.10 },
  };

  for (const region of REGIONS) {
    console.log(`  → Fetching ${region}...`);
    try {
      const regionData = await fetchRegionPricing(region);
      result.regions[region] = {
        displayName: REGION_NAMES[region] || region,
        instanceFamilies: regionData,
        discounts: {
          reserved_1yr: 0.37,
          reserved_3yr: 0.60,
          spot_average: 0.70,
        },
      };
      console.log(`  ✓ ${region}: OK`);
    } catch (error) {
      console.error(`  ✗ ${region}: ${error.message}`);
      // Use fallback data for this region
      result.regions[region] = getFallbackRegion(region);
    }
  }

  return result;
}

async function fetchRegionPricing(region) {
  const url = `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/${region}/index.json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    clearTimeout(timeout);

    return processAWSData(data);
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function processAWSData(data) {
  const products = data.products || {};
  const terms = data.terms?.OnDemand || {};
  const families = {};

  for (const [familyKey, prefixes] of Object.entries(FAMILY_PREFIXES)) {
    const instances = [];

    for (const [sku, product] of Object.entries(products)) {
      const attrs = product.attributes || {};
      if (attrs.operatingSystem !== 'Linux') continue;
      if (attrs.tenancy !== 'Shared') continue;
      if (attrs.preInstalledSw !== 'NA') continue;
      if (attrs.capacitystatus !== 'Used') continue;

      const instanceType = attrs.instanceType || '';
      const matchesPrefix = prefixes.some(p => instanceType.startsWith(p + '.'));
      if (!matchesPrefix) continue;

      const vcpu = parseInt(attrs.vcpu, 10);
      const memory = parseFloat((attrs.memory || '').replace(' GiB', ''));
      if (!vcpu || !memory) continue;

      // Get pricing
      const skuTerms = terms[sku];
      if (!skuTerms) continue;

      const termKey = Object.keys(skuTerms)[0];
      const priceDimensions = skuTerms[termKey]?.priceDimensions;
      if (!priceDimensions) continue;

      const dimKey = Object.keys(priceDimensions)[0];
      const hourlyRate = parseFloat(priceDimensions[dimKey]?.pricePerUnit?.USD || '0');
      if (hourlyRate <= 0) continue;

      instances.push({ type: instanceType, vcpu, memory, hourly: hourlyRate });
    }

    if (instances.length > 0) {
      // Calculate average per-vCPU and per-GiB rates
      let totalCpuRate = 0;
      let totalMemRate = 0;
      let count = 0;

      for (const inst of instances) {
        totalCpuRate += inst.hourly / inst.vcpu;
        totalMemRate += inst.hourly / inst.memory;
        count++;
      }

      families[familyKey] = {
        perVCpuHour: Math.round((totalCpuRate / count) * 10000) / 10000,
        perGiBHour: Math.round((totalMemRate / count) * 10000) / 10000,
        instanceCount: instances.length,
      };
    }
  }

  // If no data was found, return fallback
  if (Object.keys(families).length === 0) {
    return {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006 },
      compute_optimized: { perVCpuHour: 0.0425, perGiBHour: 0.0053 },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048 },
    };
  }

  return families;
}

function getFallbackRegion(region) {
  return {
    displayName: REGION_NAMES[region] || region,
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006 },
      compute_optimized: { perVCpuHour: 0.0425, perGiBHour: 0.0053 },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048 },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.60, spot_average: 0.70 },
  };
}
