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
const PUMPFUN_URL = process.env.PUMPFUN_CREATOR_REWARDS_URL || `https://pump.fun/profile/${VAULT}?tab=creator-rewards`;
const PUMPFUN_TOTALS_API = process.env.PUMPFUN_TOTALS_API || `https://swap-api.pump.fun/v1/fee-sharing/account/${VAULT}/totals`;

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

async function fetchSolUsdPrice() {
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/SOL-USD/spot");
    const json = await res.json();
    const v = Number(json?.data?.amount ?? 0);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

async function fetchPumpfunUnclaimedRewardsSol() {
  // Primary path: use pump.fun totals API (more reliable than scraping rendered HTML)
  try {
    const res = await fetch(PUMPFUN_TOTALS_API, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      const sol = Number(json?.shareholderUnclaimed?.sol ?? 0);
      const usd = Number(json?.shareholderUnclaimed?.usd ?? 0);
      if (Number.isFinite(sol) && sol >= 0) {
        return { value: sol, source: "pumpfun-totals-api", degraded: false, usd };
      }
    }
  } catch {
    // continue to fallback
  }

  // Fallback path: profile page parse of USD + convert to SOL
  const res = await fetch(PUMPFUN_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });

  const html = await res.text();
  const usdFromPage = extractUnclaimedFromText(html);
  if (usdFromPage != null && Number.isFinite(usdFromPage)) {
    const solUsd = await fetchSolUsdPrice();
    if (solUsd && solUsd > 0) {
      return {
        value: usdFromPage / solUsd,
        source: "pumpfun-page-usd-converted",
        degraded: false,
        usd: usdFromPage,
        solUsd,
      };
    }
  }

  return { value: 0, source: "pumpfun-unavailable", degraded: true };
}

const solBalance = await fetchVaultSolBalance();
const unclaimedInfo = await fetchPumpfunUnclaimedRewardsSol();

const beforeStakes = await client.query(api.skillApi.listAllStakes, { limit: 200 });
const beforeAccrued = (beforeStakes ?? []).reduce((sum, s) => sum + Number(s.accruedRewardSol ?? 0), 0);

const mature = await client.mutation(api.skillApi.matureDueStakes, {});
const sample = await client.mutation(api.skillApi.recordVaultSample, {
  solBalance,
  unclaimedCreatorRewardsSol: unclaimedInfo.value,
});

const afterStakes = await client.query(api.skillApi.listAllStakes, { limit: 200 });
const afterAccrued = (afterStakes ?? []).reduce((sum, s) => sum + Number(s.accruedRewardSol ?? 0), 0);
const accruedDeltaObserved = afterAccrued - beforeAccrued;
const distributed = Number(sample?.distributedDeltaSol ?? 0);
const tolerance = 1e-9;
const verified = Math.abs(accruedDeltaObserved - distributed) <= tolerance;

const output = {
  mature,
  sample,
  inputs: {
    solBalance,
    unclaimedCreatorRewardsSol: unclaimedInfo.value,
  },
  rewardsSource: unclaimedInfo,
  verification: {
    beforeAccrued,
    afterAccrued,
    accruedDeltaObserved,
    expectedDistributedDelta: distributed,
    verified,
    tolerance,
  },
  config: {
    vault: VAULT,
    mint: MINT,
    pumpfunUrl: PUMPFUN_URL,
    pumpfunTotalsApi: PUMPFUN_TOTALS_API,
  },
};

console.log(JSON.stringify(output, null, 2));

if (!verified) {
  throw new Error(`Verification failed: observed accrued delta ${accruedDeltaObserved} != distributed ${distributed}`);
}
