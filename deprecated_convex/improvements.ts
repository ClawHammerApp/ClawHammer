import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),
    strategy: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("improvements", {
      agentId: args.agentId,
      goalId: args.goalId,
      strategy: args.strategy,
      description: args.description,
      isPublic: args.isPublic,
      upvotes: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("improvements")
      .withIndex("by_public_created", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(50);
  },
});

export const listByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("improvements")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const togglePublic = mutation({
  args: { improvementId: v.id("improvements") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.improvementId);
    if (!item) throw new Error("Strategy not found");

    const now = Date.now();
    await ctx.db.patch(args.improvementId, {
      isPublic: !item.isPublic,
      updatedAt: now,
    });
  },
});

export const upvote = mutation({
  args: { improvementId: v.id("improvements") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.improvementId);
    if (!item) throw new Error("Strategy not found");

    await ctx.db.patch(args.improvementId, { upvotes: item.upvotes + 1 });
  },
});
