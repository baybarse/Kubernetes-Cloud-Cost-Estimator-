// ─── Update All Pricing — Orchestrator ────────────────────────────────────────
// Runs all provider pricing scripts and writes results to src/data/pricing/

import { fetchAWSPricing } from './fetch-aws-pricing.js';
import { fetchAzurePricing } from './fetch-azure-pricing.js';
import { fetchGCPPricing } from './fetch-gcp-pricing.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'pricing');

async function main() {
  console.log('🚀 Starting pricing data update...');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('');

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const metadata = {
    lastUpdated: new Date().toISOString(),
    source: 'api',
    providers: {},
  };

  // Fetch AWS
  try {
    const awsData = await fetchAWSPricing();
    writeJSON('aws-latest.json', awsData);
    metadata.providers.aws = {
      status: 'success',
      timestamp: awsData.lastUpdated,
      regionsUpdated: Object.keys(awsData.regions).length,
    };
    console.log('');
  } catch (error) {
    console.error(`❌ AWS pricing failed: ${error.message}`);
    metadata.providers.aws = { status: 'error', error: error.message, timestamp: new Date().toISOString() };
  }

  // Fetch Azure
  try {
    const azureData = await fetchAzurePricing();
    writeJSON('azure-latest.json', azureData);
    metadata.providers.azure = {
      status: 'success',
      timestamp: azureData.lastUpdated,
      regionsUpdated: Object.keys(azureData.regions).length,
    };
    console.log('');
  } catch (error) {
    console.error(`❌ Azure pricing failed: ${error.message}`);
    metadata.providers.azure = { status: 'error', error: error.message, timestamp: new Date().toISOString() };
  }

  // Fetch GCP
  try {
    const gcpData = await fetchGCPPricing();
    writeJSON('gcp-latest.json', gcpData);
    metadata.providers.gcp = {
      status: 'success',
      timestamp: gcpData.lastUpdated,
      regionsUpdated: Object.keys(gcpData.regions).length,
    };
    console.log('');
  } catch (error) {
    console.error(`❌ GCP pricing failed: ${error.message}`);
    metadata.providers.gcp = { status: 'error', error: error.message, timestamp: new Date().toISOString() };
  }

  // Write metadata
  writeJSON('metadata.json', metadata);

  // Summary
  console.log('');
  console.log('─── Summary ───────────────────────────────');
  for (const [provider, info] of Object.entries(metadata.providers)) {
    const icon = info.status === 'success' ? '✅' : '❌';
    console.log(`  ${icon} ${provider.toUpperCase()}: ${info.status} (${info.regionsUpdated || 0} regions)`);
  }
  console.log(`  📅 Updated: ${metadata.lastUpdated}`);
  console.log('────────────────────────────────────────────');
}

function writeJSON(filename, data) {
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  📄 Wrote ${filename}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
