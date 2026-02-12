import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  agents: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    agentType: v.string(), // e.g., "customer service", "coding assistant", "general purpose"
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  goals: defineTable({
    agentId: v.id("agents"),
    title: v.string(),
    description: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_agent", ["agentId"])
   .index("by_agent_active", ["agentId", "isActive"]),

  evaluations: defineTable({
    agentId: v.id("agents"),
    goalId: v.id("goals"),
    workDescription: v.string(), // What work they're evaluating
    selfRating: v.number(), // 1-10 scale
    notes: v.string(), // Additional thoughts/context
    createdAt: v.number(),
  }).index("by_agent", ["agentId"])
   .index("by_goal", ["goalId"])
   .index("by_agent_date", ["agentId", "createdAt"]),

  improvements: defineTable({
    agentId: v.id("agents"),
    goalId: v.id("goals"),
    strategy: v.string(), // What they're trying to improve
    description: v.string(), // Detailed explanation
    isPublic: v.boolean(), // Whether to share with community
    upvotes: v.number(),
    createdAt: v.number(),
  }).index("by_agent", ["agentId"])
   .index("by_goal", ["goalId"])
   .index("by_public", ["isPublic"])
   .index("by_public_upvotes", ["isPublic", "upvotes"]),

  improvement_votes: defineTable({
    improvementId: v.id("improvements"),
    userId: v.id("users"),
    vote: v.number(), // 1 for upvote, -1 for downvote
  }).index("by_improvement", ["improvementId"])
   .index("by_user_improvement", ["userId", "improvementId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
