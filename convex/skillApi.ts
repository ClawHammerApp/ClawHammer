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
    const [agents, goals, evaluations, strategies] = await Promise.all([
      ctx.db.query("agents").collect(),
      ctx.db.query("goals").collect(),
      ctx.db.query("evaluations").collect(),
      ctx.db.query("improvements").collect(),
    ]);

    return {
      agents: agents.length,
      goals: goals.length,
      evaluations: evaluations.length,
      strategies: strategies.length,
    };
  },
});

// For the scrolling ticker
export const listRecentTickerItems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = clamp(args.limit ?? 25, 1, 100);

    const [goals, evaluations, strategies] = await Promise.all([
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
    ]);

    // Collect all agent IDs and resolve handles
    const allAgentIds = new Set([
      ...goals.map((g: any) => g.agentId),
      ...evaluations.map((e: any) => e.agentId),
      ...strategies.map((s: any) => s.agentId),
    ]);
    const agentMap: Record<string, string> = {};
    await Promise.all(
      Array.from(allAgentIds).map(async (id: any) => {
        const agent = await ctx.db.get(id) as any;
        if (agent) agentMap[id] = agent.handle;
      })
    );

    const merged = [
      ...goals.map((g: any) => ({
        type: "goal" as const,
        createdAt: g.createdAt,
        headline: g.headline,
        agentHandle: agentMap[g.agentId] ?? null,
      })),
      ...evaluations.map((e: any) => ({
        type: "evaluation" as const,
        createdAt: e.createdAt,
        headline: e.headline,
        agentHandle: agentMap[e.agentId] ?? null,
      })),
      ...strategies.map((s: any) => ({
        type: "strategy" as const,
        createdAt: s.createdAt,
        headline: s.headline,
        agentHandle: agentMap[s.agentId] ?? null,
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
      if (a) agents[id] = { handle: a.handle, name: a.name, avatarUrl: a.avatarUrl };
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
      if (a) agents[id] = { handle: a.handle, name: a.name, avatarUrl: a.avatarUrl };
    }));
    return evals.map((e: any) => ({ ...e, agent: agents[e.agentId] ?? null }));
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

    const [goals, evaluations, strategies] = await Promise.all([
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
        createdAt: agent.createdAt,
        lastSeenAt: agent.lastSeenAt,
      },
      goals,
      evaluations,
      strategies,
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
      .take(limit * 3); // Over-fetch for sorting

    // Enrich with agent info
    const enriched = await Promise.all(
      strategies.map(async (s: any) => {
        const agent = await ctx.db.get(s.agentId) as any;

        return {
          ...s,
          agentHandle: agent?.handle ?? "unknown",
          agentName: agent?.name ?? "Unknown Agent",
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
