import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.VITE_CONVEX_URL;
if (!url) throw new Error("VITE_CONVEX_URL missing in .env.local");

const client = new ConvexHttpClient(url);

const VAULT = process.env.STAKING_VAULT_WALLET || "FBYd2KDzWuPUjUSbRb9koYcCTA3m5xdxaF18rPY888td";
const MINT = process.env.CLAWHAMMER_MINT || "6CcfJRvjgDHfEsZnXDGg7mVSuvvtZqWukZ95fBqzpump";
const RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const PUMPFUN_URL = process.env.PUMPFUN_CREATOR_REWARDS_URL || `https://pump.fun/coin/${MINT}`;

async function fetchVaultSolBalance() {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [VAULT, { commitment: "confirmed" }],
  };

  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const lamports = Number(json?.result?.value ?? 0);
  return lamports / 1e9;
}

function extractUnclaimedFromText(text) {
  const normalized = text.replace(/,/g, "");
  const patterns = [
    /unclaimed\s+creator\s+rewards[^\d]*([0-9]+(?:\.[0-9]+)?)/i,
    /unclaimed\s+rewards[^\d]*([0-9]+(?:\.[0-9]+)?)/i,
    /creator\s+rewards[^\d]*([0-9]+(?:\.[0-9]+)?)/i,
  ];

  for (const p of patterns) {
    const m = normalized.match(p);
    if (m?.[1]) return Number(m[1]);
  }
  return null;
}

async function fetchPumpfunUnclaimedRewardsSol() {
  const res = await fetch(PUMPFUN_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "accept": "text/html,application/xhtml+xml",
    },
  });

  const html = await res.text();
  const fromText = extractUnclaimedFromText(html);
  if (fromText != null && Number.isFinite(fromText)) {
    return { value: fromText, source: "pumpfun-page", degraded: false };
  }

  return { value: 0, source: "pumpfun-page-unparsed", degraded: true };
}

const solBalance = await fetchVaultSolBalance();
const unclaimedInfo = await fetchPumpfunUnclaimedRewardsSol();

const mature = await client.mutation(api.skillApi.matureDueStakes, {});
const sample = await client.mutation(api.skillApi.recordVaultSample, {
  solBalance,
  unclaimedCreatorRewardsSol: unclaimedInfo.value,
});

console.log(
  JSON.stringify(
    {
      mature,
      sample,
      inputs: {
        solBalance,
        unclaimedCreatorRewardsSol: unclaimedInfo.value,
      },
      rewardsSource: unclaimedInfo,
      config: {
        vault: VAULT,
        mint: MINT,
        pumpfunUrl: PUMPFUN_URL,
      },
    },
    null,
    2
  )
);
