// ─── Cost Calculator ──────────────────────────────────────────────────────────
import { HOURS_PER_DAY, HOURS_PER_MONTH, MONTHS_PER_YEAR } from '../utils/constants.js';
import { getProviderPricing, getAWSRegions } from '../data/aws-pricing.js';
import { getAzurePricing, getAzureRegions } from '../data/azure-pricing.js';
import { getGCPPricing, getGCPRegions } from '../data/gcp-pricing.js';

/**
 * Calculate costs for all workloads across all providers.
 */
export function calculateCosts(workloads, options = {}) {
  const {
    region = { aws: 'us-east-1', azure: 'eastus', gcp: 'us-central1' },
    instanceFamily = 'general_purpose',
    pricingModel = 'ondemand',
    daemonSetNodes = 3,
  } = options;

  const results = {
    workloads: [],
    totals: {
      aws: { hourly: 0, daily: 0, monthly: 0, yearly: 0 },
      azure: { hourly: 0, daily: 0, monthly: 0, yearly: 0 },
      gcp: { hourly: 0, daily: 0, monthly: 0, yearly: 0 },
    },
    totalResources: { cpu: 0, memory: 0, replicas: 0 },
    managementFees: { aws: 0, azure: 0, gcp: 0 },
    cheapestProvider: null,
  };

  const awsPricing = getProviderPricing(region.aws, instanceFamily);
  const azurePricing = getAzurePricing(region.azure, instanceFamily);
  const gcpPricing = getGCPPricing(region.gcp, instanceFamily);

  for (const workload of workloads) {
    const replicas = workload.replicas === -1 ? daemonSetNodes : workload.replicas;
    const cpuPerPod = workload.totalCPURequests || workload.totalCPULimits || 0.25;
    const memPerPod = workload.totalMemoryRequests || workload.totalMemoryLimits || 0.5;

    const totalCPU = cpuPerPod * replicas;
    const totalMemory = memPerPod * replicas;

    results.totalResources.cpu += totalCPU;
    results.totalResources.memory += totalMemory;
    results.totalResources.replicas += replicas;

    const workloadCost = {
      name: workload.name,
      kind: workload.kind,
      namespace: workload.namespace,
      replicas,
      cpuPerPod,
      memPerPod,
      totalCPU,
      totalMemory,
      costs: {},
    };

    for (const [provider, pricing] of [['aws', awsPricing], ['azure', azurePricing], ['gcp', gcpPricing]]) {
      const costs = calculateProviderCost(totalCPU, totalMemory, pricing, pricingModel);
      workloadCost.costs[provider] = costs;

      results.totals[provider].hourly += costs.hourly;
      results.totals[provider].daily += costs.daily;
      results.totals[provider].monthly += costs.monthly;
      results.totals[provider].yearly += costs.yearly;
    }

    results.workloads.push(workloadCost);
  }

  results.managementFees.aws = awsPricing.managementFeePerHour * HOURS_PER_MONTH;
  results.managementFees.azure = azurePricing.managementFeePerHour * HOURS_PER_MONTH;
  results.managementFees.gcp = gcpPricing.managementFeePerHour * HOURS_PER_MONTH;

  for (const provider of ['aws', 'azure', 'gcp']) {
    const mgmtHourly = provider === 'aws' ? awsPricing.managementFeePerHour
      : provider === 'azure' ? azurePricing.managementFeePerHour
      : gcpPricing.managementFeePerHour;

    results.totals[provider].hourly += mgmtHourly;
    results.totals[provider].daily += mgmtHourly * HOURS_PER_DAY;
    results.totals[provider].monthly += mgmtHourly * HOURS_PER_MONTH;
    results.totals[provider].yearly += mgmtHourly * HOURS_PER_MONTH * MONTHS_PER_YEAR;
  }

  const monthlyValues = {
    aws: results.totals.aws.monthly,
    azure: results.totals.azure.monthly,
    gcp: results.totals.gcp.monthly,
  };
  results.cheapestProvider = Object.entries(monthlyValues)
    .sort((a, b) => a[1] - b[1])[0][0];

  return results;
}

/**
 * Find cheapest regions across all providers.
 * Scans every region for every provider and returns sorted cost rankings.
 */
export function findCheapestRegions(workloads, options = {}) {
  const {
    instanceFamily = 'general_purpose',
    pricingModel = 'ondemand',
    daemonSetNodes = 3,
  } = options;

  let totalCPU = 0;
  let totalMemory = 0;
  for (const workload of workloads) {
    const replicas = workload.replicas === -1 ? daemonSetNodes : workload.replicas;
    const cpuPerPod = workload.totalCPURequests || workload.totalCPULimits || 0.25;
    const memPerPod = workload.totalMemoryRequests || workload.totalMemoryLimits || 0.5;
    totalCPU += cpuPerPod * replicas;
    totalMemory += memPerPod * replicas;
  }

  const providerConfigs = [
    { id: 'aws', regions: getAWSRegions(), getPricing: getProviderPricing },
    { id: 'azure', regions: getAzureRegions(), getPricing: getAzurePricing },
    { id: 'gcp', regions: getGCPRegions(), getPricing: getGCPPricing },
  ];

  const allResults = [];
  const perProvider = {};

  for (const { id, regions, getPricing } of providerConfigs) {
    perProvider[id] = [];

    for (const region of regions) {
      const pricing = getPricing(region.id, instanceFamily);
      const cost = calculateProviderCost(totalCPU, totalMemory, pricing, pricingModel);
      const mgmtMonthly = pricing.managementFeePerHour * HOURS_PER_MONTH;
      const monthlyTotal = cost.monthly + mgmtMonthly;

      const entry = {
        provider: id,
        region: region.id,
        regionName: region.name,
        monthly: monthlyTotal,
        hourly: cost.hourly + pricing.managementFeePerHour,
        yearly: monthlyTotal * MONTHS_PER_YEAR,
        daily: (cost.hourly + pricing.managementFeePerHour) * HOURS_PER_DAY,
      };

      perProvider[id].push(entry);
      allResults.push(entry);
    }

    perProvider[id].sort((a, b) => a.monthly - b.monthly);
  }

  allResults.sort((a, b) => a.monthly - b.monthly);

  for (const providerId of Object.keys(perProvider)) {
    const list = perProvider[providerId];
    if (list.length > 0) {
      const maxCost = list[list.length - 1].monthly;
      for (const entry of list) {
        entry.savingsVsMax = maxCost > 0 ? (maxCost - entry.monthly) / maxCost : 0;
      }
    }
  }

  const absoluteCheapest = allResults[0] || null;

  const globalMax = allResults.length > 0 ? allResults[allResults.length - 1].monthly : 0;
  for (const entry of allResults) {
    entry.savingsVsGlobalMax = globalMax > 0 ? (globalMax - entry.monthly) / globalMax : 0;
  }

  return {
    perProvider,
    allResults,
    absoluteCheapest,
    totalResources: { cpu: totalCPU, memory: totalMemory },
  };
}

/**
 * Calculate cost for a specific provider.
 */
function calculateProviderCost(totalCPU, totalMemory, pricing, pricingModel) {
  const cpuHourly = totalCPU * pricing.perVCpuHour;
  const memHourly = totalMemory * pricing.perGiBHour;
  let hourly = cpuHourly + memHourly;

  const discount = getDiscount(pricing, pricingModel);
  hourly *= (1 - discount);

  return {
    hourly,
    daily: hourly * HOURS_PER_DAY,
    monthly: hourly * HOURS_PER_MONTH,
    yearly: hourly * HOURS_PER_MONTH * MONTHS_PER_YEAR,
    breakdown: {
      cpuHourly: cpuHourly * (1 - discount),
      memHourly: memHourly * (1 - discount),
      cpuPercent: cpuHourly / (cpuHourly + memHourly || 1),
      memPercent: memHourly / (cpuHourly + memHourly || 1),
    },
  };
}

/**
 * Get discount rate based on pricing model.
 */
function getDiscount(pricing, pricingModel) {
  const discounts = pricing.discounts || {};
  switch (pricingModel) {
    case 'reserved_1yr': return discounts.reserved_1yr || 0.37;
    case 'reserved_3yr': return discounts.reserved_3yr || 0.60;
    case 'spot': return discounts.spot_average || 0.70;
    default: return 0;
  }
}
