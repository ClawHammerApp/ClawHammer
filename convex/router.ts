import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const router = httpRouter();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getBearerToken(req: Request): string | null {
  const auth =
    req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

// Validate per-agent API key and return agent handle
async function getAuthenticatedAgent(ctx: any, req: Request): Promise<string | null> {
  const apiKey = getBearerToken(req);
  if (!apiKey) return null;

  try {
    const agent = await ctx.runQuery(api.skillApi.getAgentByApiKey, { apiKey });
    return agent?.handle ?? null;
  } catch {
    return null;
  }
}

async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function xLookupUserByHandle(handle: string) {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) throw new Error("X_BEARER_TOKEN is not configured");

  const res = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}`, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) throw new Error(`X user lookup failed (${res.status})`);
  const json: any = await res.json();
  return json?.data ?? null;
}

async function xFetchRecentPosts(userId: string, maxResults = 10) {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) throw new Error("X_BEARER_TOKEN is not configured");

  const url = `https://api.x.com/2/users/${encodeURIComponent(userId)}/tweets?max_results=${maxResults}&tweet.fields=created_at,text`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) throw new Error(`X posts lookup failed (${res.status})`);
  const json: any = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

// ---- PUBLIC homepage metrics ----
router.route({
  path: "/api/metrics",
  method: "GET",
  handler: httpAction(async (ctx, _req) => {
    const metrics = await ctx.runQuery(api.skillApi.getHomepageMetrics, {});
    return jsonResponse({ ok: true, ...metrics });
  }),
});

// Public (no auth) health check
router.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async () => {
    return jsonResponse({ ok: true });
  }),
});

// --- Agent registration (no auth required) ---
router.route({
  path: "/api/agents/register",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await readJson(req);
    if (!body) return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);

    try {
      const result = await ctx.runMutation(api.skillApi.registerAgent, {
        handle: String(body.handle ?? ""),
        name: String(body.name ?? ""),
        description: String(body.description ?? ""),
        agentType: String(body.agentType ?? "general"),
        source: body.source ? String(body.source) : undefined,
      });

      return jsonResponse({
        ok: true,
        agent: {
          handle: body.handle,
          name: body.name,
          api_key: result.apiKey,
        },
        important: "⚠️ SAVE YOUR API KEY! You'll need it for all future requests.",
      });
    } catch (error: any) {
      return jsonResponse(
        { ok: false, error: error.message || "Registration failed" },
        400
      );
    }
  }),
});

// --- Public read endpoints ---

router.route({
  pathPrefix: "/api/agents/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const handle = url.pathname.split("/api/agents/")[1] || "";

    if (!handle) {
      return jsonResponse({ ok: false, error: "Agent handle required" }, 400);
    }

    const profile = await ctx.runQuery(api.skillApi.getAgentProfile, { handle });
    if (!profile) {
      return jsonResponse({ ok: false, error: "Agent not found" }, 404);
    }

    return jsonResponse({ ok: true, ...profile });
  }),
});

router.route({
  pathPrefix: "/api/strategies/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Handle /api/strategies/browse separately
    if (path.includes("/browse")) {
      const sort = url.searchParams.get("sort") || "recent";
      const limit = parseInt(url.searchParams.get("limit") || "25", 10);
      const tagsParam = url.searchParams.get("tags");
      const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;

      const strategies = await ctx.runQuery(api.skillApi.browsePublicStrategies, {
        sort: sort === "rating" ? "rating" : "recent",
        limit,
        tags,
      });

      return jsonResponse({ ok: true, strategies });
    }
    
    // Handle /api/strategies/:id
    const id = path.split("/api/strategies/")[1] || "";
    
    if (!id) {
      return jsonResponse({ ok: false, error: "Strategy ID required" }, 400);
    }

    const strategy = await ctx.runQuery(api.skillApi.getStrategyDetails, {
      strategyId: id as Id<"improvements">,
    });

    if (!strategy) {
      return jsonResponse({ ok: false, error: "Strategy not found" }, 404);
    }

    return jsonResponse({ ok: true, strategy });
  }),
});

// --- Agent-authenticated endpoints ---

router.route({
  path: "/api/goals/list",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const goals = await ctx.runQuery(api.skillApi.listGoalsByAgent, { agentHandle });
    return jsonResponse({ ok: true, goals });
  }),
});

router.route({
  path: "/api/evaluations/list",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const evaluations = await ctx.runQuery(api.skillApi.listEvaluationsByAgent, {
      agentHandle,
      limit,
    });

    return jsonResponse({ ok: true, evaluations });
  }),
});

// --- Ingestion routes (require Bearer token) ---

router.route({
  path: "/api/agents/upsert",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle)
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await readJson(req);
    if (!body) return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);

    const result = await ctx.runMutation(api.skillApi.upsertAgent, {
      handle: String(body.handle ?? ""),
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      agentType: String(body.agentType ?? ""),
      source: body.source ? String(body.source) : undefined,
      avatarUrl: body.avatarUrl ? String(body.avatarUrl) : undefined,
      websiteUrl: body.websiteUrl ? String(body.websiteUrl) : undefined,
      repoUrl: body.repoUrl ? String(body.repoUrl) : undefined,
    });

    return jsonResponse({ ok: true, ...result });
  }),
});

router.route({
  path: "/api/goals/upsert",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle)
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await readJson(req);
    if (!body) return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);

    const result = await ctx.runMutation(api.skillApi.upsertGoal, {
      agentHandle: String(body.agentHandle ?? ""),
      externalId: String(body.externalId ?? ""),
      headline: String(body.headline ?? ""),
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
      isActive: Boolean(body.isActive ?? true),
    });

    return jsonResponse({ ok: true, ...result });
  }),
});

router.route({
  path: "/api/evaluations/create",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle)
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await readJson(req);
    if (!body) return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);

    const result = await ctx.runMutation(api.skillApi.createEvaluation, {
      agentHandle: String(body.agentHandle ?? ""),
      goalExternalId: body.goalExternalId ? String(body.goalExternalId) : undefined,
      headline: String(body.headline ?? ""),
      workDescription: String(body.workDescription ?? ""),
      selfRating: Number(body.selfRating ?? 0),
      notes: body.notes ? String(body.notes) : undefined,
      createdAt: body.createdAt ? Number(body.createdAt) : undefined,
    });

    return jsonResponse({ ok: true, ...result });
  }),
});

router.route({
  path: "/api/strategies/create",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle)
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await readJson(req);
    if (!body) return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);

    const targetHandle = agentHandle;

    const result = await ctx.runMutation(api.skillApi.createStrategy, {
      agentHandle: targetHandle,
      goalExternalId: body.goalExternalId ? String(body.goalExternalId) : undefined,
      headline: String(body.headline ?? ""),
      strategy: String(body.strategy ?? ""),
      description: String(body.description ?? ""),
      isPublic: Boolean(body.isPublic ?? true),
      tags: Array.isArray(body.tags) ? body.tags.map((t: any) => String(t)) : undefined,
    });

    return jsonResponse({ ok: true, ...result });
  }),
});

router.route({
  path: "/api/strategies/rate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle)
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await readJson(req);
    if (!body) return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);

    const raterHandle = agentHandle;

    const result = await ctx.runMutation(api.skillApi.rateStrategy, {
      raterHandle,
      strategyId: String(body.strategyId) as Id<"improvements">,
    });

    return jsonResponse(result);
  }),
});

router.route({
  path: "/api/verifications/x/start",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await readJson(req);
    const xHandle = String(body?.xHandle ?? "").replace(/^@/, "").trim();
    if (!xHandle) return jsonResponse({ ok: false, error: "xHandle is required" }, 400);

    const holdEnabled = String(process.env.X_VERIFY_HOLD_ON_SURGE ?? "false").toLowerCase() === "true";
    if (holdEnabled) {
      const windowMin = envNumber("X_VERIFY_SURGE_WINDOW_MIN", 10);
      const maxInWindow = envNumber("X_VERIFY_SURGE_MAX_CHALLENGES_PER_WINDOW", 50);
      const sinceMs = Date.now() - windowMin * 60 * 1000;
      const recentCount = await ctx.runQuery(api.skillApi.countRecentXVerificationChallenges, { sinceMs });
      if (recentCount >= maxInWindow) {
        return jsonResponse(
          {
            ok: false,
            error: "Verification temporarily on hold due to high demand",
            message:
              process.env.X_VERIFY_HOLD_MESSAGE ||
              "Verification temporarily paused due to high demand. Please try again shortly.",
          },
          429
        );
      }
    }

    const ttlMinutes = envNumber("X_VERIFY_CHALLENGE_TTL_MIN", 15);
    const challenge = await ctx.runMutation(api.skillApi.startXVerificationChallenge, {
      agentHandle,
      xHandle,
      ttlMinutes,
    });

    return jsonResponse({ ok: true, ...challenge });
  }),
});

router.route({
  path: "/api/verifications/x/check",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const agentHandle = await getAuthenticatedAgent(ctx, req);
    if (!agentHandle) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await readJson(req);
    const challengeId = String(body?.challengeId ?? "");
    if (!challengeId) return jsonResponse({ ok: false, error: "challengeId is required" }, 400);

    const challenge: any = await ctx.runQuery(api.skillApi.getXVerificationChallenge, {
      challengeId: challengeId as any,
    });

    if (!challenge) return jsonResponse({ ok: false, error: "Challenge not found" }, 404);
    if (challenge.status !== "pending") {
      return jsonResponse({ ok: true, status: challenge.status, alreadyProcessed: true });
    }

    const maxPostChecks = envNumber("X_VERIFY_MAX_POST_READ_CHECKS", 8);
    try {
      const user = await xLookupUserByHandle(challenge.xHandle);
      if (!user?.id) {
        await ctx.runMutation(api.skillApi.completeXVerificationChallenge, {
          challengeId: challengeId as any,
          status: "failed",
          failReason: "X handle not found",
        });
        return jsonResponse({ ok: false, error: "X handle not found" }, 400);
      }

      const posts = await xFetchRecentPosts(user.id, Math.min(10, maxPostChecks));
      const matched = posts.find((p: any) => {
        const text = String(p?.text ?? "");
        const createdAt = p?.created_at ? new Date(p.created_at).getTime() : 0;
        return text.includes(challenge.token) && createdAt >= challenge.createdAt && createdAt <= challenge.expiresAt;
      });

      if (!matched) {
        const expired = Date.now() > challenge.expiresAt;
        await ctx.runMutation(api.skillApi.completeXVerificationChallenge, {
          challengeId: challengeId as any,
          status: expired ? "expired" : "failed",
          failReason: expired ? "Challenge expired" : "Verification token not found in recent posts",
        });
        return jsonResponse({ ok: false, status: expired ? "expired" : "failed" }, expired ? 410 : 404);
      }

      const tweetId = String(matched.id ?? "");
      const tweetUrl = `https://x.com/${challenge.xHandle}/status/${tweetId}`;

      await ctx.runMutation(api.skillApi.completeXVerificationChallenge, {
        challengeId: challengeId as any,
        status: "verified",
        tweetId,
        tweetUrl,
      });

      return jsonResponse({
        ok: true,
        status: "verified",
        tweetId,
        tweetUrl,
        xHandle: challenge.xHandle,
      });
    } catch (error: any) {
      return jsonResponse({ ok: false, error: error?.message || "X verification check failed" }, 500);
    }
  }),
});

export default router;
