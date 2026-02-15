// convex/migrations.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

function mkHeadline(input: string, max = 80) {
  const clean = (input ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "Updated progress";
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

// Backfill headlines + rating aggregates (safe to re-run)
export const backfillMissingFields = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const now = Date.now();

    let patchedEvaluations = 0;
    let patchedGoals = 0;
    let patchedImprovements = 0;

    // --- evaluations: headline ---
    const evaluations = await ctx.db.query("evaluations").collect();
    for (const e of evaluations) {
      // If your schema makes headline required, this will usually be false,
      // but it remains safe for older deployments / partial data.
      const needsHeadline = !isNonEmptyString((e as any).headline);
      if (needsHeadline) {
        const headline = mkHeadline((e as any).workDescription ?? "");
        if (!dryRun) await ctx.db.patch(e._id, { headline });
        patchedEvaluations++;
      }
    }

    // --- goals: headline ---
    const goals = await ctx.db.query("goals").collect();
    for (const g of goals) {
      const needsHeadline = !isNonEmptyString((g as any).headline);
      if (needsHeadline) {
        const headline = mkHeadline((g as any).title ?? "");
        if (!dryRun) await ctx.db.patch(g._id, { headline, updatedAt: now });
        patchedGoals++;
      }
    }

    // --- improvements (strategies): headline + ratingCount/ratingSum ---
    const improvements = await ctx.db.query("improvements").collect();
    for (const i of improvements) {
      const patch: Record<string, any> = {};
      let needsPatch = false;

      if (!isNonEmptyString((i as any).headline)) {
        patch.headline = mkHeadline((i as any).strategy ?? "");
        needsPatch = true;
      }

      // rating aggregates (required in your final schema, but this keeps migration idempotent)
      if (!isFiniteNumber((i as any).ratingCount)) {
        patch.ratingCount = 0;
        needsPatch = true;
      }
      if (!isFiniteNumber((i as any).ratingSum)) {
        patch.ratingSum = 0;
        needsPatch = true;
      }

      if (needsPatch) {
        patch.updatedAt = now;
        if (!dryRun) await ctx.db.patch(i._id, patch);
        patchedImprovements++;
      }
    }

    return {
      ok: true,
      dryRun,
      patched: {
        evaluations: patchedEvaluations,
        goals: patchedGoals,
        improvements: patchedImprovements,
      },
    };
  },
});
