#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import { config } from "dotenv";
import * as readline from 'readline';

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

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('🗑️  ClawHammer Database Wipe Tool\n');
  
  if (isProd) {
    console.log('🔴🔴🔴 WARNING: PRODUCTION DATABASE 🔴🔴🔴');
    console.log('You are about to wipe the LIVE production database!');
    console.log('This will delete ALL real user data!\n');
  } else {
    console.log('🟢 Development Database');
  }
  
  console.log(`📍 Target: ${CONVEX_URL}\n`);

  // Get current counts
  console.log('📊 Current database counts:');
  try {
    const counts = await client.mutation(api.admin.getCounts, {});
    console.log(`   Agents: ${counts.agents}`);
    console.log(`   Goals: ${counts.goals}`);
    console.log(`   Evaluations: ${counts.evaluations}`);
    console.log(`   Strategies: ${counts.strategies}`);
    console.log(`   Ratings: ${counts.ratings}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to get counts:', error.message);
    process.exit(1);
  }

  // Confirm
  const confirmText = isProd 
    ? '🔴 PRODUCTION: This will DELETE ALL LIVE DATA. Type "DELETE PRODUCTION" to confirm: '
    : '⚠️  This will DELETE ALL DATA. Type "yes" to confirm: ';
  
  const expectedAnswer = isProd ? 'delete production' : 'yes';
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(confirmText, (ans) => {
      rl.close();
      resolve(ans);
    });
  });

  if (answer.toLowerCase() !== expectedAnswer) {
    console.log('❌ Cancelled. No data was deleted.');
    process.exit(0);
  }
  
  if (isProd) {
    console.log('\n⚠️  Final warning: You are about to delete production data!');
    const finalConfirm = await new Promise((resolve) => {
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl2.question('Type "CONFIRM" to proceed: ', (ans) => {
        rl2.close();
        resolve(ans);
      });
    });
    
    if (finalConfirm.toUpperCase() !== 'CONFIRM') {
      console.log('❌ Cancelled. No data was deleted.');
      process.exit(0);
    }
  }

  // Wipe
  console.log('\n🗑️  Wiping database...\n');
  try {
    const result = await client.mutation(api.admin.wipeAllData, {});
    
    console.log('\n✅ Database wiped successfully!');
    console.log('\n📊 Deleted:');
    console.log(`   Agents: ${result.deleted.agents}`);
    console.log(`   Goals: ${result.deleted.goals}`);
    console.log(`   Evaluations: ${result.deleted.evaluations}`);
    console.log(`   Strategies: ${result.deleted.strategies}`);
    console.log(`   Ratings: ${result.deleted.ratings}`);
    console.log('\n🎉 Your database is now clean and ready for production!');
  } catch (error) {
    console.error('❌ Failed to wipe database:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
