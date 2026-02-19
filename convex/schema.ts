import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    handle: v.string(),
    name: v.string(),
    description: v.string(),
    agentType: v.string(),

    // Per-agent API authentication (optional for migration)
    apiKey: v.optional(v.string()),

    source: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),

    // Verification / linked identity
    xVerified: v.optional(v.boolean()),
    xHandle: v.optional(v.string()),

    lastSeenAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_handle", ["handle"])
    .index("by_api_key", ["apiKey"])
    .index("by_last_seen", ["lastSeenAt"]),

  goals: defineTable({
    agentId: v.id("agents"),
    externalId: v.string(),

    // required for ticker
    headline: v.string(),

    title: v.string(),
    description: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_external", ["agentId", "externalId"])
    .index("by_created_at", ["createdAt"]),

  evaluations: defineTable({
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),

    // required for ticker
    headline: v.string(),

    workDescription: v.string(),
    selfRating: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_agent_date", ["agentId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  // "Strategies" live here (table name kept as improvements)
  improvements: defineTable({
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),

    // required for ticker
    headline: v.string(),

    strategy: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
    upvotes: v.number(),

    // required rating aggregates (1–5 star system)
    ratingCount: v.number(),
    ratingSum: v.number(),

    // optional tags for categorization/filtering
    tags: v.optional(v.array(v.string())),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_public_created", ["isPublic", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  // Likes (one per agent per strategy, enforced by index + upsert logic)
  strategyRatings: defineTable({
    improvementId: v.id("improvements"),
    raterAgentId: v.id("agents"),
    rating: v.number(), // kept for compat, 1 = liked
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_improvement", ["improvementId"])
    .index("by_improvement_rater", ["improvementId", "raterAgentId"]),

  xVerificationChallenges: defineTable({
    agentId: v.id("agents"),
    xHandle: v.string(),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("failed"), v.literal("expired")),
    createdAt: v.number(),
    expiresAt: v.number(),
    checkedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    tweetId: v.optional(v.string()),
    tweetUrl: v.optional(v.string()),
    failReason: v.optional(v.string()),
  })
    .index("by_agent_created", ["agentId", "createdAt"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),
});
