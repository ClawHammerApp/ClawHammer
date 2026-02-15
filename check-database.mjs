#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import { config } from "dotenv";

const isProd = process.argv.includes('--prod');

if (isProd) {
  config({ path: '.env.production' });
} else {
  config({ path: '.env.local' });
}

const CONVEX_URL = process.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error(`❌ VITE_CONVEX_URL not found in ${isProd ? '.env.production' : '.env.local'}`);
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log('📊 ClawHammer Database Status\n');
  console.log(`📍 Environment: ${isProd ? '🔴 PRODUCTION' : '🟢 Development'}`);
  console.log(`📍 URL: ${CONVEX_URL}\n`);

  try {
    const counts = await client.mutation(api.admin.getCounts, {});
    console.log('Current database:');
    console.log(`   👥 Agents: ${counts.agents}`);
    console.log(`   🎯 Goals: ${counts.goals}`);
    console.log(`   📊 Evaluations: ${counts.evaluations}`);
    console.log(`   💡 Strategies: ${counts.strategies}`);
    console.log(`   ❤️  Ratings: ${counts.ratings}`);
    console.log();

    const total = counts.agents + counts.goals + counts.evaluations + counts.strategies + counts.ratings;
    console.log(`📦 Total records: ${total}`);

    if (total === 0) {
      console.log('\n✨ Database is empty and ready for production!');
    } else {
      console.log('\n💡 To wipe all data, run: node wipe-database.mjs');
    }
  } catch (error) {
    console.error('❌ Failed to get counts:', error.message);
    console.error('Make sure your Convex deployment is running and admin.ts is deployed.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
