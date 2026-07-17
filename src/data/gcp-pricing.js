// ─── GCP Pricing Data ─────────────────────────────────────────────────────────
const GCP_PRICING = {
  'us-central1': {
    displayName: 'Iowa (us-central1)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.032, perGiBHour: 0.0043, label: 'N2 / N2D' },
      compute_optimized: { perVCpuHour: 0.034, perGiBHour: 0.0047, label: 'C2 / C2D' },
      memory_optimized: { perVCpuHour: 0.030, perGiBHour: 0.004, label: 'M2 / M3' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.55, spot_average: 0.70 },
  },
  'us-east1': {
    displayName: 'South Carolina (us-east1)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.032, perGiBHour: 0.0043, label: 'N2' },
      compute_optimized: { perVCpuHour: 0.034, perGiBHour: 0.0047, label: 'C2' },
      memory_optimized: { perVCpuHour: 0.030, perGiBHour: 0.004, label: 'M2' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.55, spot_average: 0.70 },
  },
  'europe-west1': {
    displayName: 'Belgium (europe-west1)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.035, perGiBHour: 0.0047, label: 'N2' },
      compute_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0052, label: 'C2' },
      memory_optimized: { perVCpuHour: 0.033, perGiBHour: 0.0044, label: 'M2' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.55, spot_average: 0.68 },
  },
  'europe-west4': {
    displayName: 'Netherlands (europe-west4)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.035, perGiBHour: 0.0047, label: 'N2' },
      compute_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0052, label: 'C2' },
      memory_optimized: { perVCpuHour: 0.033, perGiBHour: 0.0044, label: 'M2' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.55, spot_average: 0.67 },
  },
  'asia-east1': {
    displayName: 'Taiwan (asia-east1)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.037, perGiBHour: 0.005, label: 'N2' },
      compute_optimized: { perVCpuHour: 0.040, perGiBHour: 0.0054, label: 'C2' },
      memory_optimized: { perVCpuHour: 0.035, perGiBHour: 0.0047, label: 'M2' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.55, spot_average: 0.66 },
  },
  'asia-northeast1': {
    displayName: 'Tokyo (asia-northeast1)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.040, perGiBHour: 0.0054, label: 'N2' },
      compute_optimized: { perVCpuHour: 0.043, perGiBHour: 0.0058, label: 'C2' },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0051, label: 'M2' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.55, spot_average: 0.64 },
  },
};

const GKE_MANAGEMENT_FEE = 0.10; // GKE Standard cluster per hour

export function getGCPPricing(region, instanceFamily = 'general_purpose') {
  const regionData = GCP_PRICING[region] || GCP_PRICING['us-central1'];
  const family = regionData.instanceFamilies[instanceFamily] || regionData.instanceFamilies.general_purpose;

  return {
    perVCpuHour: family.perVCpuHour,
    perGiBHour: family.perGiBHour,
    discounts: regionData.discounts,
    managementFeePerHour: GKE_MANAGEMENT_FEE,
    label: family.label,
    region,
    regionName: regionData.displayName,
  };
}

export function getGCPRegions() {
  return Object.entries(GCP_PRICING).map(([id, data]) => ({
    id,
    name: data.displayName,
  }));
}

export { GCP_PRICING };
