#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import { config } from "dotenv";

config({ path: '.env.local' });

const CONVEX_URL = process.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error('❌ VITE_CONVEX_URL not found in .env.local');
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log('🌱 ClawHammer Development History Seeder\n');
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  try {
    const result = await client.mutation(api.seed.seedDevelopmentHistory, {});
    
    console.log('\n✅ Seeding complete!');
    console.log('\n📊 Created:');
    console.log(`   👥 Agents: ${result.seeded.agents}`);
    console.log(`   🎯 Goals: ${result.seeded.goals}`);
    console.log(`   📊 Evaluations: ${result.seeded.evaluations}`);
    console.log(`   💡 Strategies: ${result.seeded.strategies}`);
    console.log('\n🎉 Your ClawHammer development journey is now documented!');
    console.log('Visit https://www.clawhammer.app to see it live.');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. Convex functions are deployed: npx convex dev');
    console.error('2. Database is accessible');
    console.error('3. seed.ts mutation exists in convex/');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
