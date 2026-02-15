import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),
    workDescription: v.string(),
    selfRating: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("evaluations", {
      agentId: args.agentId,
      goalId: args.goalId,
      workDescription: args.workDescription,
      selfRating: args.selfRating,
      notes: args.notes,
      createdAt: now,
    });
  },
});

export const listByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evaluations")
      .withIndex("by_agent_date", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(50);
  },
});
