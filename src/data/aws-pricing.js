// ─── AWS Pricing Data ─────────────────────────────────────────────────────────
// Fallback pricing data. Updated versions are fetched by GitHub Actions.

const AWS_PRICING = {
  'us-east-1': {
    displayName: 'US East (N. Virginia)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006, label: 'm6i / m7i' },
      compute_optimized: { perVCpuHour: 0.0425, perGiBHour: 0.0053, label: 'c6i / c7i' },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048, label: 'r6i / r7i' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.60, spot_average: 0.70 },
  },
  'us-west-2': {
    displayName: 'US West (Oregon)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.048, perGiBHour: 0.006, label: 'm6i / m7i' },
      compute_optimized: { perVCpuHour: 0.0425, perGiBHour: 0.0053, label: 'c6i / c7i' },
      memory_optimized: { perVCpuHour: 0.038, perGiBHour: 0.0048, label: 'r6i / r7i' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.60, spot_average: 0.70 },
  },
  'eu-west-1': {
    displayName: 'EU (Ireland)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.054, perGiBHour: 0.0067, label: 'm6i / m7i' },
      compute_optimized: { perVCpuHour: 0.048, perGiBHour: 0.006, label: 'c6i / c7i' },
      memory_optimized: { perVCpuHour: 0.043, perGiBHour: 0.0054, label: 'r6i / r7i' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.60, spot_average: 0.68 },
  },
  'eu-central-1': {
    displayName: 'EU (Frankfurt)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.056, perGiBHour: 0.007, label: 'm6i / m7i' },
      compute_optimized: { perVCpuHour: 0.050, perGiBHour: 0.0062, label: 'c6i / c7i' },
      memory_optimized: { perVCpuHour: 0.045, perGiBHour: 0.0056, label: 'r6i / r7i' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.60, spot_average: 0.65 },
  },
  'ap-southeast-1': {
    displayName: 'Asia Pacific (Singapore)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.058, perGiBHour: 0.0072, label: 'm6i / m7i' },
      compute_optimized: { perVCpuHour: 0.051, perGiBHour: 0.0064, label: 'c6i / c7i' },
      memory_optimized: { perVCpuHour: 0.046, perGiBHour: 0.0058, label: 'r6i / r7i' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.60, spot_average: 0.67 },
  },
  'ap-northeast-1': {
    displayName: 'Asia Pacific (Tokyo)',
    instanceFamilies: {
      general_purpose: { perVCpuHour: 0.060, perGiBHour: 0.0075, label: 'm6i / m7i' },
      compute_optimized: { perVCpuHour: 0.053, perGiBHour: 0.0066, label: 'c6i / c7i' },
      memory_optimized: { perVCpuHour: 0.048, perGiBHour: 0.006, label: 'r6i / r7i' },
    },
    discounts: { reserved_1yr: 0.37, reserved_3yr: 0.60, spot_average: 0.65 },
  },
};

const EKS_MANAGEMENT_FEE = 0.10; // per hour per cluster

/**
 * Get AWS pricing for a specific region and instance family.
 */
export function getProviderPricing(region, instanceFamily = 'general_purpose') {
  const regionData = AWS_PRICING[region] || AWS_PRICING['us-east-1'];
  const family = regionData.instanceFamilies[instanceFamily] || regionData.instanceFamilies.general_purpose;

  return {
    perVCpuHour: family.perVCpuHour,
    perGiBHour: family.perGiBHour,
    discounts: regionData.discounts,
    managementFeePerHour: EKS_MANAGEMENT_FEE,
    label: family.label,
    region,
    regionName: regionData.displayName,
  };
}

export function getAWSRegions() {
  return Object.entries(AWS_PRICING).map(([id, data]) => ({
    id,
    name: data.displayName,
  }));
}

export { AWS_PRICING };
