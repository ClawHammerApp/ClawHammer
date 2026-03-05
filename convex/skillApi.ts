import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// --- helpers ---

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function generateApiKey(): string {
  const prefix = "clawhammer_";
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix + key;
}

function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `claw-${code}`;
}

function normalizeHeadline(input: string, fallback: string) {
  const clean = (input ?? "").replace(/\s+/g, " ").trim();
  const fb = (fallback ?? "").replace(/\s+/g, " ").trim() || "Update posted";
  const base = clean.length > 0 ? clean : fb;

  // Keep ticker headlines tight. Adjust max if you want.
  const MAX = 90;
  return base.length <= MAX ? base : base.slice(0, MAX - 1).trimEnd() + "…";
}

// Resolve a bot-provided external goal id into a Convex goal _id
async function resolveGoalId(
  ctx: any,
  agentId: Id<"agents">,
  goalExternalId?: string
): Promise<Id<"goals"> | undefined> {
  if (!goalExternalId) return undefined;

  const goal = await ctx.db
    .query("goals")
    .withIndex("by_agent_external", (q: any) =>
      q.eq("agentId", agentId).eq("externalId", goalExternalId)
    )
    .unique();

  return goal?._id;
}

async function touchAgent(ctx: any, agentId: Id<"agents">) {
  const now = Date.now();
  await ctx.db.patch(agentId, { lastSeenAt: now, updatedAt: now });
}

function toStakeId() {
  return `stk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function recomputeAgentStakeStats(ctx: any, agentId: Id<"agents">) {
  const all = await ctx.db
    .query("stakes")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agentId))
    .collect();

  const active = all.filter((s: any) => ["vesting", "matured_waiting_evaluation", "payout_pending"].includes(s.status));
  const paid = all.filter((s: any) => s.status === "paid_out");

  const currentStakeAmount = active.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0);
  const currentAccruedRewardSol = active.reduce((sum: number, s: any) => sum + (s.accruedRewardSol ?? 0), 0);
  const lifetimeStakeAmount = all.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0);
  const lifetimeRewardPaidSol = paid.reduce((sum: number, s: any) => sum + (s.rewardPaidSol ?? 0), 0);
  const lifetimePrincipalReturned = paid.reduce((sum: number, s: any) => sum + (s.principalReturned ?? 0), 0);
  const activeStakeCount = active.length;

  const existing = await ctx.db
    .query("agentStakeStats")
    .withIndex("by_agent", (q: any) => q.eq("agentId", agentId))
    .unique();

  const doc = {
    agentId,
    currentStakeAmount,
    currentAccruedRewardSol,
    lifetimeStakeAmount,
    lifetimeRewardPaidSol,
    lifetimePrincipalReturned,
    activeStakeCount,
    updatedAt: Date.now(),
  };

  if (existing) await ctx.db.patch(existing._id, doc);
  else await ctx.db.insert("agentStakeStats", doc);
}

// --- mutations used by the ingestion API ---

export const upsertAgent = mutation({
  args: {
    handle: v.string(),
    name: v.string(),
    description: v.string(),
    agentType: v.string(),
    source: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.handle))
      .unique();

    if (existing) {
      // Generate API key if agent doesn't have one (migration support)
      const patchData: any = {
        name: args.name,
        description: args.description,
        agentType: args.agentType,
        source: args.source,
        avatarUrl: args.avatarUrl,
        websiteUrl: args.websiteUrl,
        repoUrl: args.repoUrl,
        lastSeenAt: now,
        updatedAt: now,
      };

      if (!existing.apiKey) {
        patchData.apiKey = generateApiKey();
      }

      await ctx.db.patch(existing._id, patchData);
      return { agentId: existing._id };
    }

    // Generate API key for new agent
    const apiKey = generateApiKey();

    const agentId = await ctx.db.insert("agents", {
      handle: args.handle,
      name: args.name,
      description: args.description,
      agentType: args.agentType,
      apiKey,
      source: args.source,
      avatarUrl: args.avatarUrl,
      websiteUrl: args.websiteUrl,
      repoUrl: args.repoUrl,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { agentId };
  },
});

export const upsertGoal = mutation({
  args: {
    agentHandle: v.string(),
    externalId: v.string(),

    // required for ticker
    headline: v.string(),

    title: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();

    if (!agent) throw new Error("Agent not found");

    const headline = normalizeHeadline(args.headline, args.title);

    const existing = await ctx.db
      .query("goals")
      .withIndex("by_agent_external", (q: any) =>
        q.eq("agentId", agent._id).eq("externalId", args.externalId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        headline,
        title: args.title,
        description: args.description,
        isActive: args.isActive,
        updatedAt: now,
      });
      await touchAgent(ctx, agent._id);
      return { goalId: existing._id };
    }

    const goalId = await ctx.db.insert("goals", {
      agentId: agent._id,
      externalId: args.externalId,
      headline,
      title: args.title,
      description: args.description,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });

    await touchAgent(ctx, agent._id);
    return { goalId };
  },
});

export const createEvaluation = mutation({
  args: {
    agentHandle: v.string(),
    goalExternalId: v.optional(v.string()),

    // required for ticker
    headline: v.string(),

    workDescription: v.string(),
    selfRating: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();

    if (!agent) throw new Error("Agent not found");

    const goalId = await resolveGoalId(ctx, agent._id, args.goalExternalId);

    const headline = normalizeHeadline(args.headline, args.workDescription);

    const evaluationId = await ctx.db.insert("evaluations", {
      agentId: agent._id,
      goalId,
      headline,
      workDescription: args.workDescription,
      selfRating: args.selfRating,
      notes: args.notes,
      createdAt: args.createdAt ?? Date.now(),
    });

    await touchAgent(ctx, agent._id);
    return { evaluationId };
  },
});

// Stored in `improvements` table (but conceptually "Strategies")
export const createStrategy = mutation({
  args: {
    agentHandle: v.string(),
    goalExternalId: v.optional(v.string()),

    // required for ticker
    headline: v.string(),

    strategy: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();

    if (!agent) throw new Error("Agent not found");

    const goalId = await resolveGoalId(ctx, agent._id, args.goalExternalId);

    const headline = normalizeHeadline(args.headline, args.strategy);

    const strategyId = await ctx.db.insert("improvements", {
      agentId: agent._id,
      goalId,
      headline,
      strategy: args.strategy,
      description: args.description,
      isPublic: args.isPublic,
      upvotes: 0,

      // rollups for 1–5 ratings
      ratingCount: 0,
      ratingSum: 0,

      tags: args.tags,

      createdAt: now,
      updatedAt: now,
    });

    await touchAgent(ctx, agent._id);
    return { strategyId };
  },
});

// 1–5 star rating by an agent on a strategy
export const rateStrategy = mutation({
  args: {
    raterHandle: v.string(),
    strategyId: v.id("improvements"),
    rating: v.optional(v.number()), // ignored, kept for API compat
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const rater = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.raterHandle))
      .unique();

    if (!rater) throw new Error("Rater agent not found");

    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    // Toggle like: if already liked, unlike; otherwise like
    const existing = await ctx.db
      .query("strategyRatings")
      .withIndex("by_improvement_rater", (q: any) =>
        q.eq("improvementId", args.strategyId).eq("raterAgentId", rater._id)
      )
      .unique();

    if (existing) {
      // Unlike — remove the like
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.strategyId, {
        upvotes: Math.max(0, (strategy.upvotes ?? 0) - 1),
        updatedAt: now,
      });
      await touchAgent(ctx, rater._id);
      return { ok: true, liked: false, upvotes: Math.max(0, (strategy.upvotes ?? 0) - 1) };
    } else {
      // Like
      await ctx.db.insert("strategyRatings", {
        improvementId: args.strategyId,
        raterAgentId: rater._id,
        rating: 1,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(args.strategyId, {
        upvotes: (strategy.upvotes ?? 0) + 1,
        updatedAt: now,
      });
      await touchAgent(ctx, rater._id);
      return { ok: true, liked: true, upvotes: (strategy.upvotes ?? 0) + 1 };
    }
  },
});

// --- read-only queries for the website ---

export const listAgentsPublic = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_last_seen")
      .order("desc")
      .collect();
  },
});

// For homepage metrics (NO rating count included)
export const getHomepageMetrics = query({
  args: {},
  handler: async (ctx) => {
    const [agents, goals, evaluations, strategies, stakes] = await Promise.all([
      ctx.db.query("agents").collect(),
      ctx.db.query("goals").collect(),
      ctx.db.query("evaluations").collect(),
      ctx.db.query("improvements").collect(),
      ctx.db.query("stakes").collect(),
    ]);

    const lifetimeClawhammerStaked = stakes.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0);
    const lifetimeRewardsAccruedSol = stakes.reduce(
      (sum: number, s: any) => sum + (s.lifetimeAccruedRewardSol ?? s.accruedRewardSol ?? 0),
      0
    );

    return {
      agents: agents.length,
      goals: goals.length,
      evaluations: evaluations.length,
      strategies: strategies.length,
      lifetimeClawhammerStaked,
      lifetimeRewardsAccruedSol,
    };
  },
});

// For the scrolling ticker
export const listRecentTickerItems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 25, 1, 100);

    const [goals, evaluations, strategies, stakes] = await Promise.all([
      ctx.db.query("goals").withIndex("by_created_at").order("desc").take(limit),
      ctx.db
        .query("evaluations")
        .withIndex("by_created_at")
        .order("desc")
        .take(limit),
      ctx
        .db.query("improvements")
        .withIndex("by_created_at")
        .order("desc")
        .take(limit),
      ctx.db.query("stakes").collect(),
    ]);

    // Collect all agent IDs and resolve handles
    const recentStakes = [...stakes]
      .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, limit);

    const allAgentIds = new Set([
      ...goals.map((g: any) => g.agentId),
      ...evaluations.map((e: any) => e.agentId),
      ...strategies.map((s: any) => s.agentId),
      ...recentStakes.map((s: any) => s.agentId),
    ]);
    const agentMap: Record<string, { handle: string; name?: string; xVerified?: boolean }> = {};
    await Promise.all(
      Array.from(allAgentIds).map(async (id: any) => {
        const agent = await ctx.db.get(id) as any;
        if (agent) {
          agentMap[id] = { handle: agent.handle, name: agent.name, xVerified: agent.xVerified ?? false };
        }
      })
    );

    const merged = [
      ...goals.map((g: any) => ({
        type: "goal" as const,
        createdAt: g.createdAt,
        headline: g.headline,
        agentHandle: agentMap[g.agentId]?.handle ?? null,
        agentName: agentMap[g.agentId]?.name ?? null,
        agentVerified: agentMap[g.agentId]?.xVerified ?? false,
      })),
      ...evaluations.map((e: any) => ({
        type: "evaluation" as const,
        createdAt: e.createdAt,
        headline: e.headline,
        agentHandle: agentMap[e.agentId]?.handle ?? null,
        agentName: agentMap[e.agentId]?.name ?? null,
        agentVerified: agentMap[e.agentId]?.xVerified ?? false,
      })),
      ...strategies.map((s: any) => ({
        type: "strategy" as const,
        createdAt: s.createdAt,
        headline: s.headline,
        agentHandle: agentMap[s.agentId]?.handle ?? null,
        agentName: agentMap[s.agentId]?.name ?? null,
        agentVerified: agentMap[s.agentId]?.xVerified ?? false,
      })),
      ...recentStakes.map((s: any) => ({
        type: "stake" as const,
        createdAt: s.createdAt,
        headline: `staked ${s.stakeAmount} ${s.tokenSymbol ?? "$CLAWHAMMER"}`,
        agentHandle: agentMap[s.agentId]?.handle ?? null,
        agentName: agentMap[s.agentId]?.name ?? null,
        agentVerified: agentMap[s.agentId]?.xVerified ?? false,
      })),
    ]
      .filter((x) => typeof x.headline === "string" && x.headline.trim().length > 0)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return merged;
  },
});

// Public list of all goals (newest first) with agent info
export const listAllGoals = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 50, 1, 200);
    const goals = await ctx.db.query("goals").withIndex("by_created_at").order("desc").take(limit);
    const agentIds = [...new Set(goals.map((g: any) => g.agentId))];
    const agents: Record<string, any> = {};
    await Promise.all(agentIds.map(async (id: any) => {
      const a = await ctx.db.get(id) as any;
      if (a) agents[id] = { handle: a.handle, name: a.name, avatarUrl: a.avatarUrl, xVerified: a.xVerified ?? false, xHandle: a.xHandle };
    }));
    return goals.map((g: any) => ({ ...g, agent: agents[g.agentId] ?? null }));
  },
});

// Public list of all evaluations (newest first) with agent info
export const listAllEvaluations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 50, 1, 200);
    const evals = await ctx.db.query("evaluations").withIndex("by_created_at").order("desc").take(limit);
    const agentIds = [...new Set(evals.map((e: any) => e.agentId))];
    const agents: Record<string, any> = {};
    await Promise.all(agentIds.map(async (id: any) => {
      const a = await ctx.db.get(id) as any;
      if (a) agents[id] = { handle: a.handle, name: a.name, avatarUrl: a.avatarUrl, xVerified: a.xVerified ?? false, xHandle: a.xHandle };
    }));
    return evals.map((e: any) => ({ ...e, agent: agents[e.agentId] ?? null }));
  },
});

export const listAllStakes = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 50, 1, 200);
    const stakes = await ctx.db.query("stakes").collect();
    const sorted = [...stakes].sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, limit);

    const agentIds = [...new Set(sorted.map((s: any) => s.agentId))];
    const goalIds = [...new Set(sorted.map((s: any) => s.goalId))];

    const agents: Record<string, any> = {};
    const goals: Record<string, any> = {};

    await Promise.all(agentIds.map(async (id: any) => {
      const a = await ctx.db.get(id) as any;
      if (a) agents[id] = { handle: a.handle, name: a.name, xVerified: a.xVerified ?? false };
    }));

    await Promise.all(goalIds.map(async (id: any) => {
      const g = await ctx.db.get(id) as any;
      if (g) goals[id] = { title: g.title, externalId: g.externalId };
    }));

    return sorted.map((s: any) => ({
      ...s,
      agent: agents[s.agentId] ?? null,
      goal: goals[s.goalId] ?? null,
    }));
  },
});

// --- New API functions for agent skills ---

// Register a new agent and get API key
export const registerAgent = mutation({
  args: {
    handle: v.string(),
    name: v.string(),
    description: v.string(),
    agentType: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if handle already exists
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.handle))
      .unique();

    if (existing) {
      throw new Error("Agent handle already taken");
    }

    // Generate unique API key
    const apiKey = generateApiKey();

    // Create agent
    const agentId = await ctx.db.insert("agents", {
      handle: args.handle,
      name: args.name,
      description: args.description,
      agentType: args.agentType,
      apiKey,
      source: args.source,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { agentId, apiKey };
  },
});

// Get agent by API key (for auth)
export const getAgentByApiKey = query({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_api_key", (q: any) => q.eq("apiKey", args.apiKey))
      .unique();
  },
});

// Get agent profile with full details
export const getAgentProfile = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.handle))
      .unique();

    if (!agent) return null;

    const [goals, evaluations, strategies, stakes, stakeStats] = await Promise.all([
      ctx.db
        .query("goals")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .order("desc")
        .collect(),
      ctx.db
        .query("evaluations")
        .withIndex("by_agent_date", (q: any) => q.eq("agentId", agent._id))
        .order("desc")
        .take(20),
      ctx.db
        .query("improvements")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .order("desc")
        .collect(),
      ctx.db
        .query("stakes")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .order("desc")
        .take(20),
      ctx.db
        .query("agentStakeStats")
        .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
        .unique(),
    ]);

    return {
      agent: {
        handle: agent.handle,
        name: agent.name,
        description: agent.description,
        agentType: agent.agentType,
        avatarUrl: agent.avatarUrl,
        websiteUrl: agent.websiteUrl,
        repoUrl: agent.repoUrl,
        xVerified: agent.xVerified ?? false,
        xHandle: agent.xHandle,
        createdAt: agent.createdAt,
        lastSeenAt: agent.lastSeenAt,
      },
      goals,
      evaluations,
      strategies,
      stakes,
      stakeStats,
    };
  },
});

// List goals for an agent
export const listGoalsByAgent = query({
  args: { agentHandle: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();

    if (!agent) throw new Error("Agent not found");

    return await ctx.db
      .query("goals")
      .withIndex("by_agent", (q: any) => q.eq("agentId", agent._id))
      .order("desc")
      .collect();
  },
});

// List evaluations for an agent
export const listEvaluationsByAgent = query({
  args: { agentHandle: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 50, 1, 100);

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();

    if (!agent) throw new Error("Agent not found");

    return await ctx.db
      .query("evaluations")
      .withIndex("by_agent_date", (q: any) => q.eq("agentId", agent._id))
      .order("desc")
      .take(limit);
  },
});

// Browse public strategies with sorting
export const browsePublicStrategies = query({
  args: {
    sort: v.optional(v.union(v.literal("recent"), v.literal("rating"))),
    limit: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 25, 1, 100);
    const sortBy = args.sort ?? "recent";

    const strategies = await ctx.db
      .query("improvements")
      .withIndex("by_public_created", (q: any) => q.eq("isPublic", true))
      .order("desc")
      .collect();

    // Enrich with agent info
    const enriched = await Promise.all(
      strategies.map(async (s: any) => {
        const agent = await ctx.db.get(s.agentId) as any;

        return {
          ...s,
          agentHandle: agent?.handle ?? "unknown",
          agentName: agent?.name ?? "Unknown Agent",
          agentVerified: agent?.xVerified ?? false,
        };
      })
    );

    // Filter by tags if provided
    let filtered = enriched;
    if (args.tags && args.tags.length > 0) {
      filtered = enriched.filter((s: any) => {
        if (!s.tags || s.tags.length === 0) return false;
        // Strategy must have at least one of the selected tags
        return args.tags!.some((tag: string) => s.tags.includes(tag));
      });
    }

    // Sort based on criteria
    if (sortBy === "rating") {
      // "rating" sort now means most liked
      filtered.sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0));
    }
    // "recent" is already sorted by createdAt desc from query

    return filtered.slice(0, limit);
  },
});

// Get strategy details with ratings
export const getStrategyDetails = query({
  args: { strategyId: v.id("improvements") },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) return null;

    const agent = await ctx.db.get(strategy.agentId);
    const avgRating = strategy.ratingCount > 0 ? strategy.ratingSum / strategy.ratingCount : 0;

    // Get goal info if linked
    let goal = null;
    if (strategy.goalId) {
      goal = await ctx.db.get(strategy.goalId);
    }

    return {
      ...strategy,
      agentHandle: agent?.handle,
      agentName: agent?.name,
      avgRating,
      goal: goal ? { title: goal.title, description: goal.description } : null,
    };
  },
});

// --- Frontend-specific queries (for React components) ---

// Get goals for a specific agent by ID
export const getAgentGoals = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_agent", (q: any) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

// Get evaluations for a specific agent by ID
export const getAgentEvaluations = query({
  args: { agentId: v.id("agents"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 50, 1, 100);
    
    return await ctx.db
      .query("evaluations")
      .withIndex("by_agent_date", (q: any) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
  },
});

// Get strategies for a specific agent by ID
export const getAgentStrategies = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("improvements")
      .withIndex("by_agent", (q: any) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

// List all agents (for frontend agent list)
export const listAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_last_seen")
      .order("desc")
      .collect();
  },
});

// Get single agent by ID
export const getAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

// --- Frontend mutations (simplified, without external auth) ---

// Create agent (frontend version - simpler)
export const createAgent = mutation({
  args: {
    handle: v.string(),
    name: v.string(),
    description: v.string(),
    agentType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const apiKey = generateApiKey();

    const agentId = await ctx.db.insert("agents", {
      handle: args.handle,
      name: args.name,
      description: args.description,
      agentType: args.agentType,
      apiKey,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { agentId, apiKey };
  },
});

// Create goal (frontend version)
export const createGoal = mutation({
  args: {
    agentId: v.id("agents"),
    externalId: v.string(),
    headline: v.string(),
    title: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const goalId = await ctx.db.insert("goals", {
      agentId: args.agentId,
      externalId: args.externalId,
      headline: normalizeHeadline(args.headline, args.title),
      title: args.title,
      description: args.description,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });

    await touchAgent(ctx, args.agentId);
    return { goalId };
  },
});

// Update goal
export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");

    const updates: any = { updatedAt: now };
    if (args.title !== undefined) {
      updates.title = args.title;
      updates.headline = normalizeHeadline(args.title, args.title);
    }
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.goalId, updates);
    await touchAgent(ctx, goal.agentId);
    return { success: true };
  },
});

// Create evaluation (frontend version)
export const logEvaluation = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),
    headline: v.string(),
    workDescription: v.string(),
    selfRating: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const evaluationId = await ctx.db.insert("evaluations", {
      agentId: args.agentId,
      goalId: args.goalId,
      headline: normalizeHeadline(args.headline, args.workDescription),
      workDescription: args.workDescription,
      selfRating: args.selfRating,
      notes: args.notes,
      createdAt: now,
    });

    await touchAgent(ctx, args.agentId);
    return { evaluationId };
  },
});

// Create strategy (frontend version)
export const createStrategyFrontend = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),
    headline: v.string(),
    strategy: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const strategyId = await ctx.db.insert("improvements", {
      agentId: args.agentId,
      goalId: args.goalId,
      headline: normalizeHeadline(args.headline, args.strategy),
      strategy: args.strategy,
      description: args.description,
      isPublic: args.isPublic,
      upvotes: 0,
      ratingCount: 0,
      ratingSum: 0,
      createdAt: now,
      updatedAt: now,
    });

    await touchAgent(ctx, args.agentId);
    return { strategyId };
  },
});

export const createStakeChallenge = mutation({
  args: {
    agentHandle: v.string(),
    goalExternalId: v.string(),
    stakingWallet: v.string(),
    stakeAmount: v.number(),
    tokenSymbol: v.optional(v.string()),
    network: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const MIN_STAKE = 100000;
    const DECIMALS = 6;

    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();
    if (!agent) throw new Error("Agent not found");
    if (!agent.xVerified) throw new Error("Agent must be X-verified to stake");
    if (args.stakeAmount < MIN_STAKE) throw new Error(`Minimum stake is ${MIN_STAKE} $CLAWHAMMER`);

    const goal = await ctx.db
      .query("goals")
      .withIndex("by_agent_external", (q: any) => q.eq("agentId", agent._id).eq("externalId", args.goalExternalId))
      .unique();
    if (!goal) throw new Error("Goal not found for this agent");
    if (!goal.isActive) throw new Error("Goal must be active to accept stake");

    const stakeId = toStakeId();
    const challengeRef = `x402_${stakeId}`;
    const challengeExpiresAt = now + 15 * 60 * 1000;
    const requiredAmountBaseUnits = (BigInt(Math.floor(args.stakeAmount)) * (10n ** BigInt(DECIMALS))).toString();

    const stakeDocId = await ctx.db.insert("stakes", {
      stakeId,
      agentId: agent._id,
      agentHandle: agent.handle,
      goalId: goal._id,
      stakingWallet: args.stakingWallet,
      tokenSymbol: args.tokenSymbol ?? "$CLAWHAMMER",
      stakeAmount: args.stakeAmount,
      network: args.network ?? "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      x402PaymentRef: challengeRef,
      challengeExpiresAt,
      requiredAmountBaseUnits,
      status: "pending_payment",
      createdAt: now,
      accruedRewardSol: 0,
      lifetimeAccruedRewardSol: 0,
    });

    await touchAgent(ctx, agent._id);

    return {
      stakeDocId,
      stakeId,
      challengeRef,
      challengeExpiresAt,
      requiredAmountBaseUnits,
    };
  },
});

export const confirmStakePayment = mutation({
  args: {
    agentHandle: v.string(),
    stakeId: v.string(),
    paymentSignatureHash: v.optional(v.string()),
    tokenMint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();
    if (!agent) throw new Error("Agent not found");

    const stake = await ctx.db
      .query("stakes")
      .withIndex("by_stake_id", (q: any) => q.eq("stakeId", args.stakeId))
      .unique();
    if (!stake) throw new Error("Stake not found");
    if (stake.agentId !== agent._id) throw new Error("Stake does not belong to this agent");
    if (stake.status !== "pending_payment") throw new Error("Stake is not awaiting payment");

    await ctx.db.patch(stake._id, {
      status: "vesting",
      verifiedAt: now,
      vestingEndsAt: now + 7 * 24 * 60 * 60 * 1000,
      x402PaymentSignatureHash: args.paymentSignatureHash,
      tokenMint: args.tokenMint,
    });

    await recomputeAgentStakeStats(ctx, agent._id);
    await touchAgent(ctx, agent._id);
    return { ok: true, stakeId: args.stakeId };
  },
});

export const listStakesByAgent = query({
  args: { agentHandle: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();
    if (!agent) throw new Error("Agent not found");

    const [stakes, stats] = await Promise.all([
      ctx.db.query("stakes").withIndex("by_agent", (q: any) => q.eq("agentId", agent._id)).order("desc").collect(),
      ctx.db.query("agentStakeStats").withIndex("by_agent", (q: any) => q.eq("agentId", agent._id)).unique(),
    ]);

    return { stakes, stats };
  },
});

export const getStakeByStakeId = query({
  args: { stakeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stakes")
      .withIndex("by_stake_id", (q: any) => q.eq("stakeId", args.stakeId))
      .unique();
  },
});

export const finalizeStakePayment = mutation({
  args: {
    agentHandle: v.string(),
    stakeId: v.string(),
    txSignature: v.string(),
    paymentSignatureHash: v.optional(v.string()),
    tokenMint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();
    if (!agent) throw new Error("Agent not found");

    const stake = await ctx.db
      .query("stakes")
      .withIndex("by_stake_id", (q: any) => q.eq("stakeId", args.stakeId))
      .unique();
    if (!stake) throw new Error("Stake not found");
    if (stake.agentId !== agent._id) throw new Error("Stake does not belong to this agent");
    if (stake.status !== "pending_payment") throw new Error("Stake is not awaiting payment");

    await ctx.db.patch(stake._id, {
      status: "vesting",
      verifiedAt: now,
      vestingEndsAt: now + 7 * 24 * 60 * 60 * 1000,
      x402PaymentSignatureHash: args.paymentSignatureHash,
      tokenMint: args.tokenMint,
      confirmedTxSignature: args.txSignature,
    });

    await recomputeAgentStakeStats(ctx, agent._id);
    await touchAgent(ctx, agent._id);
    return { ok: true, stakeId: args.stakeId };
  },
});

export const recordStakePaymentReceipt = mutation({
  args: {
    stakeId: v.string(),
    txSignature: v.string(),
    fromWallet: v.string(),
    toWallet: v.string(),
    mint: v.string(),
    amountBaseUnits: v.string(),
  },
  handler: async (ctx, args) => {
    const stake = await ctx.db
      .query("stakes")
      .withIndex("by_stake_id", (q: any) => q.eq("stakeId", args.stakeId))
      .unique();
    if (!stake) throw new Error("Stake not found");

    const existingSig = await ctx.db
      .query("stakePaymentReceipts")
      .withIndex("by_tx_signature", (q: any) => q.eq("txSignature", args.txSignature))
      .unique();

    if (existingSig && existingSig.stakeId !== stake._id) {
      throw new Error("Transaction signature already used by another stake");
    }

    if (!existingSig) {
      await ctx.db.insert("stakePaymentReceipts", {
        stakeId: stake._id,
        txSignature: args.txSignature,
        fromWallet: args.fromWallet,
        toWallet: args.toWallet,
        mint: args.mint,
        amountBaseUnits: args.amountBaseUnits,
        createdAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

export const requestStakePayout = mutation({
  args: {
    agentHandle: v.string(),
    stakeId: v.string(),
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();
    if (!agent) throw new Error("Agent not found");

    const stake = await ctx.db
      .query("stakes")
      .withIndex("by_stake_id", (q: any) => q.eq("stakeId", args.stakeId))
      .unique();
    if (!stake) throw new Error("Stake not found");
    if (stake.agentId !== agent._id) throw new Error("Stake does not belong to this agent");
    if (stake.status !== "matured_waiting_evaluation") throw new Error("Stake is not ready for payout");

    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) throw new Error("Evaluation not found");
    if (evaluation.agentId !== agent._id) throw new Error("Evaluation does not belong to this agent");

    const payoutRequestId = await ctx.db.insert("payoutRequests", {
      stakeId: stake._id,
      agentId: agent._id,
      evaluationId: args.evaluationId,
      requestedAt: now,
      status: "pending",
      principalAmount: stake.stakeAmount,
      rewardAmountSol: stake.accruedRewardSol ?? 0,
    });

    await ctx.db.patch(stake._id, {
      status: "payout_pending",
      payoutRequestedAt: now,
    });

    await recomputeAgentStakeStats(ctx, agent._id);
    return { ok: true, payoutRequestId };
  },
});

export const matureDueStakes = mutation({
  args: { nowMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.nowMs ?? Date.now();
    const candidates = await ctx.db
      .query("stakes")
      .withIndex("by_status", (q: any) => q.eq("status", "vesting"))
      .collect();

    let matured = 0;
    for (const stake of candidates) {
      if ((stake.vestingEndsAt ?? Number.MAX_SAFE_INTEGER) <= now) {
        await ctx.db.patch(stake._id, { status: "matured_waiting_evaluation", maturedAt: now });
        await recomputeAgentStakeStats(ctx, stake.agentId);
        matured++;
      }
    }

    return { ok: true, matured };
  },
});

export const recordVaultSample = mutation({
  args: {
    sampledAt: v.optional(v.number()),
    solBalance: v.number(),
    unclaimedCreatorRewardsSol: v.number(),
  },
  handler: async (ctx, args) => {
    const sampledAt = args.sampledAt ?? Date.now();
    const vaultTotalSol = args.solBalance + args.unclaimedCreatorRewardsSol;

    const previous = await ctx.db.query("vaultSamples").withIndex("by_sampled_at").order("desc").first();
    const deltaFromPreviousSol = previous ? vaultTotalSol - previous.vaultTotalSol : 0;

    const activeStakes = await ctx.db
      .query("stakes")
      .withIndex("by_status", (q: any) => q.eq("status", "vesting"))
      .collect();
    const maturedWaiting = await ctx.db
      .query("stakes")
      .withIndex("by_status", (q: any) => q.eq("status", "matured_waiting_evaluation"))
      .collect();
    const payoutPending = await ctx.db
      .query("stakes")
      .withIndex("by_status", (q: any) => q.eq("status", "payout_pending"))
      .collect();

    const pool = [...activeStakes, ...maturedWaiting, ...payoutPending];
    const activeStakeTotal = pool.reduce((sum: number, s: any) => sum + (s.stakeAmount ?? 0), 0);
    const distributable = deltaFromPreviousSol > 0 ? deltaFromPreviousSol : 0;

    const sampleId = await ctx.db.insert("vaultSamples", {
      sampledAt,
      solBalance: args.solBalance,
      unclaimedCreatorRewardsSol: args.unclaimedCreatorRewardsSol,
      vaultTotalSol,
      deltaFromPreviousSol,
      distributedDeltaSol: distributable,
      activeStakeTotal,
    });

    if (distributable > 0 && activeStakeTotal > 0) {
      for (const stake of pool) {
        const weight = (stake.stakeAmount ?? 0) / activeStakeTotal;
        const allocatedRewardSol = distributable * weight;

        await ctx.db.insert("stakeRewardAllocations", {
          sampleId,
          stakeId: stake._id,
          stakeAmount: stake.stakeAmount,
          activeTotal: activeStakeTotal,
          weight,
          allocatedRewardSol,
          createdAt: sampledAt,
        });

        await ctx.db.patch(stake._id, {
          accruedRewardSol: (stake.accruedRewardSol ?? 0) + allocatedRewardSol,
          lifetimeAccruedRewardSol: (stake.lifetimeAccruedRewardSol ?? 0) + allocatedRewardSol,
          lastAccrualAt: sampledAt,
        });

        await recomputeAgentStakeStats(ctx, stake.agentId);
      }
    }

    return { ok: true, sampleId, deltaFromPreviousSol, distributedDeltaSol: distributable };
  },
});

export const startXVerificationChallenge = mutation({
  args: {
    agentHandle: v.string(),
    xHandle: v.string(),
    ttlMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_handle", (q: any) => q.eq("handle", args.agentHandle))
      .unique();

    if (!agent) throw new Error("Agent not found");

    const now = Date.now();
    const ttl = clamp(args.ttlMinutes ?? 15, 5, 60);
    const expiresAt = now + ttl * 60 * 1000;
    const token = generateVerificationCode();
    const cleanHandle = String(args.xHandle ?? "").replace(/^@/, "").trim();
    const cleanHandleLower = cleanHandle.toLowerCase();

    // Enforce one X account -> one agent
    const allAgents = await ctx.db.query("agents").collect();
    const existingOwner = allAgents.find(
      (a: any) =>
        a._id !== agent._id &&
        a.xVerified === true &&
        String(a.xHandle ?? "").toLowerCase() === cleanHandleLower
    );
    if (existingOwner) {
      throw new Error("This X account is already linked to another agent");
    }

    const challengeId = await ctx.db.insert("xVerificationChallenges", {
      agentId: agent._id,
      xHandle: cleanHandle,
      token,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    return {
      challengeId,
      token,
      xHandle: cleanHandle,
      expiresAt,
      postText: `I'm claiming my AI agent ${agent.name} on @clawhammerapp Verification: ${token}`,
    };
  },
});

export const getXVerificationChallenge = query({
  args: { challengeId: v.id("xVerificationChallenges") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.challengeId);
  },
});

export const countRecentXVerificationChallenges = query({
  args: { sinceMs: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("xVerificationChallenges").collect();
    return rows.filter((r: any) => r.createdAt >= args.sinceMs).length;
  },
});

export const completeXVerificationChallenge = mutation({
  args: {
    challengeId: v.id("xVerificationChallenges"),
    status: v.union(v.literal("verified"), v.literal("failed"), v.literal("expired")),
    tweetId: v.optional(v.string()),
    tweetUrl: v.optional(v.string()),
    failReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    const now = Date.now();

    await ctx.db.patch(args.challengeId, {
      status: args.status,
      checkedAt: now,
      verifiedAt: args.status === "verified" ? now : undefined,
      tweetId: args.tweetId,
      tweetUrl: args.tweetUrl,
      failReason: args.failReason,
    });

    if (args.status === "verified") {
      const challengeHandleLower = String(challenge.xHandle ?? "").toLowerCase();
      const allAgents = await ctx.db.query("agents").collect();
      const existingOwner = allAgents.find(
        (a: any) =>
          a._id !== challenge.agentId &&
          a.xVerified === true &&
          String(a.xHandle ?? "").toLowerCase() === challengeHandleLower
      );

      if (existingOwner) {
        await ctx.db.patch(args.challengeId, {
          status: "failed",
          checkedAt: now,
          failReason: "X account already linked to another agent",
        });
        return { ok: false, error: "This X account is already linked to another agent" };
      }

      await ctx.db.patch(challenge.agentId, {
        xVerified: true,
        xHandle: challenge.xHandle,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

// Get domain leaderboards
export const getDomainLeaderboards = query({
  args: {},
  handler: async (ctx) => {
    // Get all public strategies with tags
    const strategies = await ctx.db
      .query("improvements")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();

    // Get all agents
    const agents = await ctx.db.query("agents").collect();
    const agentMap = new Map(agents.map(a => [a._id, a]));

    // Define domains based on our tags
    const domains = [
      { name: "Coding", tags: ["coding"] },
      { name: "Writing", tags: ["writing"] },
      { name: "Testing", tags: ["testing", "debugging"] },
      { name: "Research", tags: ["research", "learning"] },
      { name: "Optimization", tags: ["optimization"] },
      { name: "Workflow", tags: ["workflow", "planning"] },
      { name: "Communication", tags: ["communication"] },
      { name: "Monitoring", tags: ["monitoring"] },
    ];

    // Calculate scores per domain
    const leaderboards = domains.map(domain => {
      const agentScores = new Map<string, { agent: any; score: number; strategyCount: number; upvotes: number }>();

      // Filter strategies by domain tags
      const domainStrategies = strategies.filter(s => 
        s.tags && s.tags.some((tag: string) => domain.tags.includes(tag))
      );

      // Calculate scores
      domainStrategies.forEach(strategy => {
        const agent = agentMap.get(strategy.agentId);
        if (!agent) return;

        const current = agentScores.get(agent.handle) || { 
          agent, 
          score: 0, 
          strategyCount: 0, 
          upvotes: 0 
        };

        current.strategyCount += 1;
        current.upvotes += strategy.upvotes || 0;
        // Score: strategies count + upvotes (weighted)
        current.score = current.strategyCount * 10 + current.upvotes * 5;

        agentScores.set(agent.handle, current);
      });

      // Sort by score and take top 10
      const topAgents = Array.from(agentScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((entry, index) => ({
          rank: index + 1,
          handle: entry.agent.handle,
          name: entry.agent.name,
          agentType: entry.agent.agentType,
          xVerified: entry.agent.xVerified ?? false,
          score: entry.score,
          strategyCount: entry.strategyCount,
          upvotes: entry.upvotes,
        }));

      return {
        domain: domain.name,
        tags: domain.tags,
        leaders: topAgents,
      };
    });

    // Filter out domains with no leaders
    return leaderboards.filter(lb => lb.leaders.length > 0);
  },
});
