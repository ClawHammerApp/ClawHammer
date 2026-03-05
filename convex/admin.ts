import { action, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * DANGER: This wipes ALL data from the database.
 * Use this to clear test data before production launch.
 */
export const wipeAllData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Starting database wipe...");

    // Delete all strategy ratings first (has foreign keys)
    const ratings = await ctx.db.query("strategyRatings").collect();
    for (const rating of ratings) {
      await ctx.db.delete(rating._id);
    }
    console.log(`✅ Deleted ${ratings.length} strategy ratings`);

    // Delete all improvements (strategies)
    const improvements = await ctx.db.query("improvements").collect();
    for (const improvement of improvements) {
      await ctx.db.delete(improvement._id);
    }
    console.log(`✅ Deleted ${improvements.length} strategies`);

    // Delete all evaluations
    const evaluations = await ctx.db.query("evaluations").collect();
    for (const evaluation of evaluations) {
      await ctx.db.delete(evaluation._id);
    }
    console.log(`✅ Deleted ${evaluations.length} evaluations`);

    // Delete all goals
    const goals = await ctx.db.query("goals").collect();
    for (const goal of goals) {
      await ctx.db.delete(goal._id);
    }
    console.log(`✅ Deleted ${goals.length} goals`);

    // Delete all agents
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }
    console.log(`✅ Deleted ${agents.length} agents`);

    console.log("🎉 Database wipe complete!");

    return {
      ok: true,
      deleted: {
        agents: agents.length,
        goals: goals.length,
        evaluations: evaluations.length,
        strategies: improvements.length,
        ratings: ratings.length,
      },
    };
  },
});

/**
 * Get counts of all data (useful to verify wipe)
 */
export const getCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const goals = await ctx.db.query("goals").collect();
    const evaluations = await ctx.db.query("evaluations").collect();
    const improvements = await ctx.db.query("improvements").collect();
    const ratings = await ctx.db.query("strategyRatings").collect();

    return {
      agents: agents.length,
      goals: goals.length,
      evaluations: evaluations.length,
      strategies: improvements.length,
      ratings: ratings.length,
    };
  },
});

/**
 * Internal test helper: link @clawhammerapp to the clawhammer agent.
 */
export const linkClawhammerXTest = mutation({
  args: {
    handle: v.optional(v.string()),
    xHandle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle ?? "clawhammer-clone-20260219-124442";
    const xHandle = args.xHandle ?? "clawhammerapp";

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();

    if (!agent) {
      throw new Error(`${handle} agent not found`);
    }

    const now = Date.now();
    await ctx.db.patch(agent._id, {
      xVerified: true,
      xHandle,
      updatedAt: now,
    });

    return {
      ok: true,
      handle: agent.handle,
      xVerified: true,
      xHandle,
    };
  },
});

/**
 * Internal diagnostic: ping required X API calls once and return last post summary.
 */
export const testXApisOnce = action({
  args: {
    xHandle: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const xHandle = String(args.xHandle ?? "clawhammerapp").replace(/^@/, "").trim();
    const bearer = process.env.X_BEARER_TOKEN;
    if (!bearer) {
      throw new Error("X_BEARER_TOKEN is not configured");
    }

    // 1) users/by/username
    const userRes = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(xHandle)}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    const userJson: any = await userRes.json();
    if (!userRes.ok || !userJson?.data?.id) {
      throw new Error(`X user lookup failed (${userRes.status})`);
    }

    // 2) users/:id/tweets
    const postsRes = await fetch(
      `https://api.x.com/2/users/${encodeURIComponent(userJson.data.id)}/tweets?max_results=5&tweet.fields=created_at,text`,
      { headers: { Authorization: `Bearer ${bearer}` } }
    );
    const postsJson: any = await postsRes.json();
    if (!postsRes.ok) {
      throw new Error(`X posts lookup failed (${postsRes.status})`);
    }

    const latest = Array.isArray(postsJson?.data) && postsJson.data.length > 0 ? postsJson.data[0] : null;

    return {
      ok: true,
      xHandle,
      userLookup: {
        status: userRes.status,
        id: userJson.data.id,
        username: userJson.data.username,
        name: userJson.data.name,
      },
      postsLookup: {
        status: postsRes.status,
        count: Array.isArray(postsJson?.data) ? postsJson.data.length : 0,
        latest: latest
          ? {
              id: latest.id,
              created_at: latest.created_at,
              text: latest.text,
              url: `https://x.com/${xHandle}/status/${latest.id}`,
            }
          : null,
      },
    };
  },
});

/**
 * Internal migration helper: clone goals/evaluations/strategies (with timestamps) from one agent to another.
 */
export const deleteAgentByHandle = mutation({
  args: {
    handle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle ?? "clawhammer";
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();

    if (!agent) {
      return { ok: true, deleted: false, reason: "not_found" };
    }

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
      .collect();
    for (const g of goals) await ctx.db.delete(g._id);

    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("by_agent_date", (q: any) => q.eq("agentId", agent._id))
      .collect();
    for (const e of evaluations) await ctx.db.delete(e._id);

    const improvements = await ctx.db
      .query("improvements")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
      .collect();
    for (const s of improvements) {
      const ratings = await ctx.db
        .query("strategyRatings")
        .withIndex("by_improvement", (q: any) => q.eq("improvementId", s._id))
        .collect();
      for (const r of ratings) await ctx.db.delete(r._id);
      await ctx.db.delete(s._id);
    }

    const xChallenges = await ctx.db
      .query("xVerificationChallenges")
      .withIndex("by_agent_created", (q: any) => q.eq("agentId", agent._id))
      .collect();
    for (const c of xChallenges) await ctx.db.delete(c._id);

    await ctx.db.delete(agent._id);

    return {
      ok: true,
      deleted: true,
      handle,
      counts: {
        goals: goals.length,
        evaluations: evaluations.length,
        strategies: improvements.length,
        xChallenges: xChallenges.length,
      },
    };
  },
});

export const tagClawhammerStrategies = mutation({
  args: {
    handle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle ?? "clawhammer";

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();

    if (!agent) throw new Error(`Agent not found: ${handle}`);

    const strategies = await ctx.db
      .query("improvements")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
      .collect();

    const uniq = (arr: string[]) => Array.from(new Set(arr));
    let updated = 0;

    for (const s of strategies) {
      const text = `${s.headline || ""} ${s.strategy || ""} ${s.description || ""}`.toLowerCase();
      const tags = new Set<string>(Array.isArray(s.tags) ? s.tags : []);

      if (/deploy|vercel|production|release|launch/.test(text)) tags.add("workflow");
      if (/blob|url|api|router|endpoint|schema|database|convex/.test(text)) tags.add("coding");
      if (/verify|verification|x handle|badge|token/.test(text)) tags.add("monitoring");
      if (/memory|learn|discovery|insight|strategy/.test(text)) tags.add("research");
      if (/safe|risk|confirm|destructive|guard|ownership/.test(text)) tags.add("testing");
      if (/process|handoff|checklist|steps|flow/.test(text)) tags.add("workflow");

      if (tags.size === 0) {
        tags.add("workflow");
        tags.add("research");
      }

      const nextTags = uniq(Array.from(tags));
      const prevTags = Array.isArray(s.tags) ? s.tags : [];
      if (JSON.stringify(prevTags) !== JSON.stringify(nextTags)) {
        await ctx.db.patch(s._id, { tags: nextTags, updatedAt: Date.now() });
        updated++;
      }
    }

    return { ok: true, handle, total: strategies.length, updated };
  },
});

export const renameAgentHandle = mutation({
  args: {
    fromHandle: v.optional(v.string()),
    toHandle: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fromHandle = args.fromHandle ?? "clawhammer-clone-20260219-124442";
    const toHandle = args.toHandle ?? "clawhammer";
    const targetName = args.name ?? "clawhammer";

    const existingTarget = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", toHandle))
      .unique();
    if (existingTarget && toHandle !== fromHandle) {
      throw new Error(`Target handle already exists: ${toHandle}`);
    }

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", fromHandle))
      .unique();

    if (!agent) {
      throw new Error(`Agent not found: ${fromHandle}`);
    }

    const now = Date.now();
    await ctx.db.patch(agent._id, {
      handle: toHandle,
      name: targetName,
      updatedAt: now,
    });

    return { ok: true, fromHandle, toHandle, name: targetName };
  },
});

export const clearAgentXVerification = mutation({
  args: {
    handle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle ?? "clawhammer-clone-20260219-124442";

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();

    if (!agent) {
      throw new Error(`Agent not found: ${handle}`);
    }

    const now = Date.now();
    await ctx.db.patch(agent._id, {
      xVerified: false,
      xHandle: undefined,
      updatedAt: now,
    });

    return { ok: true, handle, xVerified: false, xHandle: null };
  },
});

export const backdateAgentCreatedAt = mutation({
  args: {
    handle: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle ?? "clawhammer-clone-20260219-124442";

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();

    if (!agent) {
      throw new Error(`Agent not found: ${handle}`);
    }

    const now = Date.now();
    const targetCreatedAt = args.createdAt ?? (now - 3 * 24 * 60 * 60 * 1000);

    await ctx.db.patch(agent._id, {
      createdAt: targetCreatedAt,
      updatedAt: now,
    });

    return {
      ok: true,
      handle,
      createdAt: targetCreatedAt,
    };
  },
});

export const createTempClawhammerStakePreview = mutation({
  args: {},
  handler: async (ctx) => {
    const handle = "clawhammer";
    const now = Date.now();

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();
    if (!agent) throw new Error("clawhammer agent not found");

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
      .order("desc")
      .take(1);

    const goal = goals[0];
    if (!goal) throw new Error("clawhammer has no goals");

    const stakeId = `tmp_preview_${now}`;
    const minStake = 100000;
    const decimals = 6;
    const requiredAmountBaseUnits = (BigInt(minStake) * (10n ** BigInt(decimals))).toString();

    const stakeDocId = await ctx.db.insert("stakes", {
      stakeId,
      agentId: agent._id,
      agentHandle: agent.handle,
      goalId: goal._id,
      stakingWallet: "PreviewWallet1111111111111111111111111111111111",
      tokenSymbol: "$CLAWHAMMER",
      tokenMint: "6CcfJRvjgDHfEsZnXDGg7mVSuvvtZqWukZ95fBqzpump",
      stakeAmount: minStake,
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      x402PaymentRef: `x402_${stakeId}`,
      x402PaymentSignatureHash: "tmp_preview_signature",
      challengeExpiresAt: now + 15 * 60 * 1000,
      requiredAmountBaseUnits,
      confirmedTxSignature: "tmp_preview_tx_signature",
      status: "vesting",
      createdAt: now,
      verifiedAt: now,
      vestingEndsAt: now + 7 * 24 * 60 * 60 * 1000,
      accruedRewardSol: 0.123456,
      lifetimeAccruedRewardSol: 0.123456,
      lastAccrualAt: now,
    });

    const existingStats = await ctx.db
      .query("agentStakeStats")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
      .unique();

    const statsPatch = {
      agentId: agent._id,
      currentStakeAmount: (existingStats?.currentStakeAmount ?? 0) + minStake,
      currentAccruedRewardSol: (existingStats?.currentAccruedRewardSol ?? 0) + 0.123456,
      lifetimeStakeAmount: (existingStats?.lifetimeStakeAmount ?? 0) + minStake,
      lifetimeRewardPaidSol: existingStats?.lifetimeRewardPaidSol ?? 0,
      lifetimePrincipalReturned: existingStats?.lifetimePrincipalReturned ?? 0,
      activeStakeCount: (existingStats?.activeStakeCount ?? 0) + 1,
      updatedAt: now,
    };

    if (existingStats) await ctx.db.patch(existingStats._id, statsPatch);
    else await ctx.db.insert("agentStakeStats", statsPatch);

    await ctx.db.insert("stakePaymentReceipts", {
      stakeId: stakeDocId,
      txSignature: `tmp_preview_tx_${now}`,
      fromWallet: "PreviewWallet1111111111111111111111111111111111",
      toWallet: "FBYd2KDzWuPUjUSbRb9koYcCTA3m5xdxaF18rPY888td",
      mint: "6CcfJRvjgDHfEsZnXDGg7mVSuvvtZqWukZ95fBqzpump",
      amountBaseUnits: requiredAmountBaseUnits,
      createdAt: now,
    });

    return {
      ok: true,
      temporary: true,
      stakeId,
      goalId: goal._id,
      goalTitle: goal.title,
      note: "Temporary preview data created. Remove later with admin cleanup.",
    };
  },
});

export const cleanupTempClawhammerStakePreviews = mutation({
  args: {},
  handler: async (ctx) => {
    const tempStakes = (await ctx.db.query("stakes").collect()).filter((s: any) =>
      String(s.stakeId ?? "").startsWith("tmp_preview_")
    );

    let receiptsDeleted = 0;
    for (const stake of tempStakes) {
      const receipts = await ctx.db
        .query("stakePaymentReceipts")
        .withIndex("by_stake", (q: any) => q.eq("stakeId", stake._id))
        .collect();
      for (const r of receipts) {
        await ctx.db.delete(r._id);
        receiptsDeleted++;
      }

      const payoutRequests = await ctx.db
        .query("payoutRequests")
        .withIndex("by_stake", (q: any) => q.eq("stakeId", stake._id))
        .collect();
      for (const p of payoutRequests) {
        await ctx.db.delete(p._id);
      }

      await ctx.db.delete(stake._id);
    }

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", "clawhammer"))
      .unique();

    if (agent) {
      const allStakes = await ctx.db
        .query("stakes")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .collect();
      const active = allStakes.filter((s: any) => ["vesting", "matured_waiting_evaluation", "payout_pending"].includes(s.status));
      const paid = allStakes.filter((s: any) => s.status === "paid_out");

      const currentStakeAmount = active.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0);
      const currentAccruedRewardSol = active.reduce((sum: number, s: any) => sum + (s.accruedRewardSol ?? 0), 0);
      const lifetimeStakeAmount = allStakes.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0);
      const lifetimeRewardPaidSol = paid.reduce((sum: number, s: any) => sum + (s.rewardPaidSol ?? 0), 0);
      const lifetimePrincipalReturned = paid.reduce((sum: number, s: any) => sum + (s.principalReturned ?? 0), 0);
      const activeStakeCount = active.length;

      const stat = await ctx.db
        .query("agentStakeStats")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .unique();

      const payload = {
        agentId: agent._id,
        currentStakeAmount,
        currentAccruedRewardSol,
        lifetimeStakeAmount,
        lifetimeRewardPaidSol,
        lifetimePrincipalReturned,
        activeStakeCount,
        updatedAt: Date.now(),
      };

      if (stat) await ctx.db.patch(stat._id, payload);
      else await ctx.db.insert("agentStakeStats", payload);
    }

    return {
      ok: true,
      deletedTempStakes: tempStakes.length,
      deletedReceipts: receiptsDeleted,
    };
  },
});

export const cleanupPendingStakeEntries = mutation({
  args: {
    handle: v.optional(v.string()),
    stakeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle ?? "clawhammer";

    let stakes = await ctx.db.query("stakes").collect();

    if (args.stakeId) {
      stakes = stakes.filter((s: any) => s.stakeId === args.stakeId);
    } else {
      const agent = await ctx.db
        .query("agents")
        .withIndex("by_handle", (q: any) => q.eq("handle", handle))
        .unique();
      if (!agent) throw new Error(`Agent not found: ${handle}`);
      stakes = stakes.filter((s: any) => s.agentId === agent._id && s.status === "pending_payment");
    }

    let deletedStakes = 0;
    let deletedReceipts = 0;
    let deletedPayoutRequests = 0;

    for (const stake of stakes) {
      const receipts = await ctx.db
        .query("stakePaymentReceipts")
        .withIndex("by_stake", (q: any) => q.eq("stakeId", stake._id))
        .collect();
      for (const r of receipts) {
        await ctx.db.delete(r._id);
        deletedReceipts++;
      }

      const payouts = await ctx.db
        .query("payoutRequests")
        .withIndex("by_stake", (q: any) => q.eq("stakeId", stake._id))
        .collect();
      for (const p of payouts) {
        await ctx.db.delete(p._id);
        deletedPayoutRequests++;
      }

      await ctx.db.delete(stake._id);
      deletedStakes++;
    }

    // Recompute clawhammer stats safely from counted statuses only
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", handle))
      .unique();

    if (agent) {
      const all = await ctx.db
        .query("stakes")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .collect();

      const counted = all.filter((s: any) => ["vesting", "matured_waiting_evaluation", "payout_pending", "paid_out"].includes(s.status));
      const active = counted.filter((s: any) => ["vesting", "matured_waiting_evaluation", "payout_pending"].includes(s.status));
      const paid = counted.filter((s: any) => s.status === "paid_out");

      const payload = {
        agentId: agent._id,
        currentStakeAmount: active.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0),
        currentAccruedRewardSol: active.reduce((sum: number, s: any) => sum + (s.accruedRewardSol ?? 0), 0),
        lifetimeStakeAmount: counted.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0),
        lifetimeRewardPaidSol: paid.reduce((sum: number, s: any) => sum + (s.rewardPaidSol ?? 0), 0),
        lifetimePrincipalReturned: paid.reduce((sum: number, s: any) => sum + (s.principalReturned ?? 0), 0),
        activeStakeCount: active.length,
        updatedAt: Date.now(),
      };

      const stat = await ctx.db
        .query("agentStakeStats")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .unique();
      if (stat) await ctx.db.patch(stat._id, payload);
      else await ctx.db.insert("agentStakeStats", payload);
    }

    return { ok: true, deletedStakes, deletedReceipts, deletedPayoutRequests };
  },
});

export const resetLatestVaultSampleToZero = mutation({
  args: {},
  handler: async (ctx) => {
    const latest = await ctx.db.query("vaultSamples").withIndex("by_sampled_at").order("desc").first();
    if (latest) {
      const allocs = await ctx.db
        .query("stakeRewardAllocations")
        .withIndex("by_sample", (q: any) => q.eq("sampleId", latest._id))
        .collect();
      for (const a of allocs) await ctx.db.delete(a._id);
      await ctx.db.delete(latest._id);
    }

    const sampleId = await ctx.db.insert("vaultSamples", {
      sampledAt: Date.now(),
      solBalance: 0,
      unclaimedCreatorRewardsSol: 0,
      vaultTotalSol: 0,
      deltaFromPreviousSol: 0,
      distributedDeltaSol: 0,
      activeStakeTotal: 0,
    });

    return { ok: true, deletedLatest: Boolean(latest), zeroSampleId: sampleId };
  },
});

export const cloneAgentData = mutation({
  args: {
    sourceHandle: v.optional(v.string()),
    targetHandle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sourceHandle = args.sourceHandle ?? "clawhammer";

    let targetHandle = args.targetHandle;
    if (!targetHandle) {
      const allAgents = await ctx.db.query("agents").collect();
      const cloneCandidates = allAgents
        .filter((a: any) => String(a.handle).startsWith("clawhammer-clone-"))
        .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      targetHandle = cloneCandidates[0]?.handle;
    }

    if (!targetHandle) {
      throw new Error("No targetHandle provided and no clawhammer-clone-* agent found");
    }

    const source = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", sourceHandle))
      .unique();
    if (!source) throw new Error(`Source agent not found: ${sourceHandle}`);

    const target = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", targetHandle))
      .unique();
    if (!target) throw new Error(`Target agent not found: ${targetHandle}`);

    const sourceGoals = await ctx.db
      .query("goals")
      .withIndex("by_agent", (q: any) => q.eq("agentId", source._id))
      .collect();

    const targetGoals = await ctx.db
      .query("goals")
      .withIndex("by_agent", (q: any) => q.eq("agentId", target._id))
      .collect();

    const targetGoalByExternal = new Map<string, any>();
    for (const g of targetGoals) targetGoalByExternal.set(g.externalId, g);

    let goalsCopied = 0;
    for (const g of sourceGoals) {
      if (!targetGoalByExternal.has(g.externalId)) {
        const newGoalId = await ctx.db.insert("goals", {
          agentId: target._id,
          externalId: g.externalId,
          headline: g.headline,
          title: g.title,
          description: g.description,
          isActive: g.isActive,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        });
        targetGoalByExternal.set(g.externalId, { ...g, _id: newGoalId });
        goalsCopied++;
      }
    }

    const sourceToTargetGoalId = new Map<string, any>();
    for (const sg of sourceGoals) {
      const tg = targetGoalByExternal.get(sg.externalId);
      if (tg?._id) sourceToTargetGoalId.set(String(sg._id), tg._id);
    }

    const sourceEvals = await ctx.db
      .query("evaluations")
      .withIndex("by_agent_date", (q: any) => q.eq("agentId", source._id))
      .collect();
    const targetEvals = await ctx.db
      .query("evaluations")
      .withIndex("by_agent_date", (q: any) => q.eq("agentId", target._id))
      .collect();

    const evalFingerprint = (e: any) => `${e.headline}||${e.workDescription}||${e.selfRating}||${e.createdAt}`;
    const targetEvalSet = new Set(targetEvals.map((e: any) => evalFingerprint(e)));

    let evaluationsCopied = 0;
    for (const e of sourceEvals) {
      const fp = evalFingerprint(e);
      if (targetEvalSet.has(fp)) continue;
      await ctx.db.insert("evaluations", {
        agentId: target._id,
        goalId: e.goalId ? sourceToTargetGoalId.get(String(e.goalId)) : undefined,
        headline: e.headline,
        workDescription: e.workDescription,
        selfRating: e.selfRating,
        notes: e.notes,
        createdAt: e.createdAt,
      });
      evaluationsCopied++;
    }

    const sourceStrategies = await ctx.db
      .query("improvements")
      .withIndex("by_agent", (q: any) => q.eq("agentId", source._id))
      .collect();
    const targetStrategies = await ctx.db
      .query("improvements")
      .withIndex("by_agent", (q: any) => q.eq("agentId", target._id))
      .collect();

    const strategyFingerprint = (s: any) => `${s.headline}||${s.strategy}||${s.description}||${s.createdAt}`;
    const targetStrategySet = new Set(targetStrategies.map((s: any) => strategyFingerprint(s)));

    let strategiesCopied = 0;
    for (const s of sourceStrategies) {
      const fp = strategyFingerprint(s);
      if (targetStrategySet.has(fp)) continue;
      await ctx.db.insert("improvements", {
        agentId: target._id,
        goalId: s.goalId ? sourceToTargetGoalId.get(String(s.goalId)) : undefined,
        headline: s.headline,
        strategy: s.strategy,
        description: s.description,
        isPublic: s.isPublic,
        upvotes: s.upvotes ?? 0,
        ratingCount: s.ratingCount ?? 0,
        ratingSum: s.ratingSum ?? 0,
        tags: s.tags,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      });
      strategiesCopied++;
    }

    const now = Date.now();
    await ctx.db.patch(target._id, { updatedAt: now, lastSeenAt: now });

    return {
      ok: true,
      sourceHandle: source.handle,
      targetHandle: target.handle,
      sourceCounts: {
        goals: sourceGoals.length,
        evaluations: sourceEvals.length,
        strategies: sourceStrategies.length,
      },
      copied: {
        goals: goalsCopied,
        evaluations: evaluationsCopied,
        strategies: strategiesCopied,
      },
    };
  },
});