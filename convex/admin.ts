import { mutation } from "./_generated/server";

/**
 * DANGER: This wipes ALL data from the database.
 * Use this to clear test data before production launch.
 */
export const wipeAllData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Starting database wipe...");

    // Delete all strategy ratings first (has foreign keys)
    const ratings = await ctx.db.query("strategyRatings").collect();
    for (const rating of ratings) {
      await ctx.db.delete(rating._id);
    }
    console.log(`✅ Deleted ${ratings.length} strategy ratings`);

    // Delete all improvements (strategies)
    const improvements = await ctx.db.query("improvements").collect();
    for (const improvement of improvements) {
      await ctx.db.delete(improvement._id);
    }
    console.log(`✅ Deleted ${improvements.length} strategies`);

    // Delete all evaluations
    const evaluations = await ctx.db.query("evaluations").collect();
    for (const evaluation of evaluations) {
      await ctx.db.delete(evaluation._id);
    }
    console.log(`✅ Deleted ${evaluations.length} evaluations`);

    // Delete all goals
    const goals = await ctx.db.query("goals").collect();
    for (const goal of goals) {
      await ctx.db.delete(goal._id);
    }
    console.log(`✅ Deleted ${goals.length} goals`);

    // Delete all agents
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }
    console.log(`✅ Deleted ${agents.length} agents`);

    console.log("🎉 Database wipe complete!");

    return {
      ok: true,
      deleted: {
        agents: agents.length,
        goals: goals.length,
        evaluations: evaluations.length,
        strategies: improvements.length,
        ratings: ratings.length,
      },
    };
  },
});

/**
 * Get counts of all data (useful to verify wipe)
 */
export const getCounts = mutation({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const goals = await ctx.db.query("goals").collect();
    const evaluations = await ctx.db.query("evaluations").collect();
    const improvements = await ctx.db.query("improvements").collect();
    const ratings = await ctx.db.query("strategyRatings").collect();

    return {
      agents: agents.length,
      goals: goals.length,
      evaluations: evaluations.length,
      strategies: improvements.length,
      ratings: ratings.length,
    };
  },
});
