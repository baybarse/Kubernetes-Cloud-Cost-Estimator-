// ─── Azure Pricing Data ───────────────────────────────────────────────────────
const AZURE_PRICING = {
  'eastus': {
    displayName: 'East US',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006, label: 'Dsv5 / Dsv6' },
      compute_optimized: { perVCpuHour: 0.042, perGiBHour: 0.0053, label: 'Fsv2' },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048, label: 'Esv5 / Esv6' },
    },
    discounts: { reserved_1yr: 0.38, reserved_3yr: 0.57, spot_average: 0.68 },
  },
  'westeurope': {
    displayName: 'West Europe',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.055, perGiBHour: 0.0069, label: 'Dsv5' },
      compute_optimized: { perVCpuHour: 0.049, perGiBHour: 0.006, label: 'Fsv2' },
      memory_optimized: { perVCpuHour: 0.044, perGiBHour: 0.0055, label: 'Esv5' },
    },
    discounts: { reserved_1yr: 0.38, reserved_3yr: 0.57, spot_average: 0.65 },
  },
  'centralus': {
    displayName: 'Central US',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006, label: 'Dsv5' },
      compute_optimized: { perVCpuHour: 0.042, perGiBHour: 0.0053, label: 'Fsv2' },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048, label: 'Esv5' },
    },
    discounts: { reserved_1yr: 0.38, reserved_3yr: 0.57, spot_average: 0.68 },
  },
  'northeurope': {
    displayName: 'North Europe',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.052, perGiBHour: 0.0065, label: 'Dsv5' },
      compute_optimized: { perVCpuHour: 0.046, perGiBHour: 0.0058, label: 'Fsv2' },
      memory_optimized: { perVCpuHour: 0.042, perGiBHour: 0.0052, label: 'Esv5' },
    },
    discounts: { reserved_1yr: 0.38, reserved_3yr: 0.57, spot_average: 0.66 },
  },
  'southeastasia': {
    displayName: 'Southeast Asia',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.057, perGiBHour: 0.0071, label: 'Dsv5' },
      compute_optimized: { perVCpuHour: 0.050, perGiBHour: 0.0063, label: 'Fsv2' },
      memory_optimized: { perVCpuHour: 0.045, perGiBHour: 0.0056, label: 'Esv5' },
    },
    discounts: { reserved_1yr: 0.38, reserved_3yr: 0.57, spot_average: 0.64 },
  },
  'japaneast': {
    displayName: 'Japan East',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.060, perGiBHour: 0.0075, label: 'Dsv5' },
      compute_optimized: { perVCpuHour: 0.053, perGiBHour: 0.0066, label: 'Fsv2' },
      memory_optimized: { perVCpuHour: 0.048, perGiBHour: 0.006, label: 'Esv5' },
    },
    discounts: { reserved_1yr: 0.38, reserved_3yr: 0.57, spot_average: 0.62 },
  },
};

const AKS_MANAGEMENT_FEE = 0.0; // AKS free tier (Standard tier is $0.10/hr)

export function getAzurePricing(region, instanceFamily = 'general_purpose') {
  const regionData = AZURE_PRICING[region] || AZURE_PRICING['eastus'];
  const family = regionData.instanceFamilies[instanceFamily] || regionData.instanceFamilies.general_purpose;

  return {
    perVCpuHour: family.perVCpuHour,
    perGiBHour: family.perGiBHour,
    discounts: regionData.discounts,
    managementFeePerHour: AKS_MANAGEMENT_FEE,
    label: family.label,
    region,
    regionName: regionData.displayName,
  };
}

export function getAzureRegions() {
  return Object.entries(AZURE_PRICING).map(([id, data]) => ({
    id,
    name: data.displayName,
  }));
}

export { AZURE_PRICING };
