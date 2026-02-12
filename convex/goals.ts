import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    title: v.string(),
    description: v.string(),
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

    return await ctx.db.insert("goals", {
      agentId: args.agentId,
      title: args.title,
      description: args.description,
      isActive: true,
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

    return await ctx.db
      .query("goals")
      .withIndex("by_agent_active", (q) => q.eq("agentId", args.agentId).eq("isActive", true))
      .order("desc")
      .collect();
  },
});

export const toggle = mutation({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const goal = await ctx.db.get(args.goalId);
    if (!goal) {
      throw new Error("Goal not found");
    }

    // Verify agent ownership
    const agent = await ctx.db.get(goal.agentId);
    if (!agent || agent.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.goalId, {
      isActive: !goal.isActive,
    });
  },
});
