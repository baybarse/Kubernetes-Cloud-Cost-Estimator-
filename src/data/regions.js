// ─── Regions Data ─────────────────────────────────────────────────────────────
import { getAWSRegions } from './aws-pricing.js';
import { getAzureRegions } from './azure-pricing.js';
import { getGCPRegions } from './gcp-pricing.js';

export function getAllRegions() {
  return {
    aws: getAWSRegions(),
    azure: getAzureRegions(),
    gcp: getGCPRegions(),
  };
}

export const DEFAULT_REGIONS = {
  aws: 'us-east-1',
  azure: 'eastus',
  gcp: 'us-central1',
};
