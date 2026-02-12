import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.id("goals"),
    strategy: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
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

    return await ctx.db.insert("improvements", {
      agentId: args.agentId,
      goalId: args.goalId,
      strategy: args.strategy,
      description: args.description,
      isPublic: args.isPublic,
      upvotes: 0,
      createdAt: Date.now(),
    });
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const improvements = await ctx.db
      .query("improvements")
      .withIndex("by_public_upvotes", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(20);

    // Get agent and goal info for each improvement
    const improvementsWithDetails = await Promise.all(
      improvements.map(async (improvement) => {
        const agent = await ctx.db.get(improvement.agentId);
        const goal = await ctx.db.get(improvement.goalId);
        return {
          ...improvement,
          agent,
          goal,
        };
      })
    );

    return improvementsWithDetails;
  },
});

export const vote = mutation({
  args: {
    improvementId: v.id("improvements"),
    vote: v.number(), // 1 for upvote, -1 for downvote
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if user already voted
    const existingVote = await ctx.db
      .query("improvement_votes")
      .withIndex("by_user_improvement", (q) => 
        q.eq("userId", userId).eq("improvementId", args.improvementId)
      )
      .unique();

    const improvement = await ctx.db.get(args.improvementId);
    if (!improvement) {
      throw new Error("Improvement not found");
    }

    if (existingVote) {
      // Update existing vote
      const voteDiff = args.vote - existingVote.vote;
      await ctx.db.patch(existingVote._id, { vote: args.vote });
      await ctx.db.patch(args.improvementId, {
        upvotes: improvement.upvotes + voteDiff,
      });
    } else {
      // Create new vote
      await ctx.db.insert("improvement_votes", {
        improvementId: args.improvementId,
        userId,
        vote: args.vote,
      });
      await ctx.db.patch(args.improvementId, {
        upvotes: improvement.upvotes + args.vote,
      });
    }
  },
});
