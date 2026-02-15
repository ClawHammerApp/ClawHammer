import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function genExternalId() {
  const now = Date.now();
  const rand = Math.random().toString(16).slice(2);
  return `goal_${now}_${rand}`;
}

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("goals", {
      agentId: args.agentId,
      externalId: genExternalId(),
      title: args.title,
      description: args.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsert = mutation({
  args: {
    agentId: v.id("agents"),
    externalId: v.string(),
    title: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("goals")
      .withIndex("by_agent_external", (q) =>
        q.eq("agentId", args.agentId).eq("externalId", args.externalId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        isActive: args.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("goals", {
      agentId: args.agentId,
      externalId: args.externalId,
      title: args.title,
      description: args.description,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const toggle = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new Error("Goal not found");

    const now = Date.now();
    await ctx.db.patch(args.goalId, {
      isActive: !goal.isActive,
      updatedAt: now,
    });
  },
});
