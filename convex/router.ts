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

      const strategies = await ctx.runQuery(api.skillApi.browsePublicStrategies, {
        sort: sort === "rating" ? "rating" : "recent",
        limit,
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

export default router;
