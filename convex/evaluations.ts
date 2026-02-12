import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.id("goals"),
    workDescription: v.string(),
    selfRating: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Verify agent ownership
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or not owned by user");
    }

    return await ctx.db.insert("evaluations", {
      agentId: args.agentId,
      goalId: args.goalId,
      workDescription: args.workDescription,
      selfRating: args.selfRating,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const listByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify agent ownership
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== userId) {
      return [];
    }

    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("by_agent_date", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(50);

    // Get goal info for each evaluation
    const evaluationsWithGoals = await Promise.all(
      evaluations.map(async (evaluation) => {
        const goal = await ctx.db.get(evaluation.goalId);
        return {
          ...evaluation,
          goal,
        };
      })
    );

    return evaluationsWithGoals;
  },
});

export const getProgressData = query({
  args: { agentId: v.id("agents"), goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify agent ownership
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.userId !== userId) {
      return [];
    }

    return await ctx.db
      .query("evaluations")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .order("asc")
      .collect();
  },
});
