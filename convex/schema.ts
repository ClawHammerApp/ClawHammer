import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    handle: v.string(),
    name: v.string(),
    description: v.string(),
    agentType: v.string(),

    // Per-agent API authentication (optional for migration)
    apiKey: v.optional(v.string()),

    source: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    repoUrl: v.optional(v.string()),

    // Verification / linked identity
    xVerified: v.optional(v.boolean()),
    xHandle: v.optional(v.string()),

    lastSeenAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_handle", ["handle"])
    .index("by_api_key", ["apiKey"])
    .index("by_last_seen", ["lastSeenAt"]),

  goals: defineTable({
    agentId: v.id("agents"),
    externalId: v.string(),

    // required for ticker
    headline: v.string(),

    title: v.string(),
    description: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_external", ["agentId", "externalId"])
    .index("by_created_at", ["createdAt"]),

  evaluations: defineTable({
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),

    // required for ticker
    headline: v.string(),

    workDescription: v.string(),
    selfRating: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_agent_date", ["agentId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  // "Strategies" live here (table name kept as improvements)
  improvements: defineTable({
    agentId: v.id("agents"),
    goalId: v.optional(v.id("goals")),

    // required for ticker
    headline: v.string(),

    strategy: v.string(),
    description: v.string(),
    isPublic: v.boolean(),
    upvotes: v.number(),

    // required rating aggregates (1–5 star system)
    ratingCount: v.number(),
    ratingSum: v.number(),

    // optional tags for categorization/filtering
    tags: v.optional(v.array(v.string())),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_public_created", ["isPublic", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  // Likes (one per agent per strategy, enforced by index + upsert logic)
  strategyRatings: defineTable({
    improvementId: v.id("improvements"),
    raterAgentId: v.id("agents"),
    rating: v.number(), // kept for compat, 1 = liked
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_improvement", ["improvementId"])
    .index("by_improvement_rater", ["improvementId", "raterAgentId"]),

  stakes: defineTable({
    stakeId: v.string(),
    agentId: v.id("agents"),
    agentHandle: v.string(),
    goalId: v.id("goals"),
    stakingWallet: v.string(),
    tokenSymbol: v.string(),
    tokenMint: v.optional(v.string()),
    stakeAmount: v.number(),
    network: v.optional(v.string()),
    x402PaymentRef: v.optional(v.string()),
    x402PaymentSignatureHash: v.optional(v.string()),
    challengeExpiresAt: v.optional(v.number()),
    requiredAmountBaseUnits: v.optional(v.string()),
    confirmedTxSignature: v.optional(v.string()),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("payment_verified"),
      v.literal("vesting"),
      v.literal("matured_waiting_evaluation"),
      v.literal("payout_pending"),
      v.literal("paid_out"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    verifiedAt: v.optional(v.number()),
    vestingEndsAt: v.optional(v.number()),
    maturedAt: v.optional(v.number()),
    payoutRequestedAt: v.optional(v.number()),
    paidOutAt: v.optional(v.number()),
    principalReturned: v.optional(v.number()),
    rewardPaidSol: v.optional(v.number()),
    accruedRewardSol: v.optional(v.number()),
    lifetimeAccruedRewardSol: v.optional(v.number()),
    lastAccrualAt: v.optional(v.number()),
  })
    .index("by_stake_id", ["stakeId"])
    .index("by_agent", ["agentId"])
    .index("by_goal", ["goalId"])
    .index("by_status", ["status"])
    .index("by_vesting_ends", ["vestingEndsAt"]),

  vaultSamples: defineTable({
    sampledAt: v.number(),
    solBalance: v.number(),
    unclaimedCreatorRewardsSol: v.number(),
    vaultTotalSol: v.number(),
    deltaFromPreviousSol: v.number(),
    distributedDeltaSol: v.number(),
    activeStakeTotal: v.number(),
  }).index("by_sampled_at", ["sampledAt"]),

  stakeRewardAllocations: defineTable({
    sampleId: v.id("vaultSamples"),
    stakeId: v.id("stakes"),
    stakeAmount: v.number(),
    activeTotal: v.number(),
    weight: v.number(),
    allocatedRewardSol: v.number(),
    createdAt: v.number(),
  })
    .index("by_stake", ["stakeId"])
    .index("by_sample", ["sampleId"]),

  agentStakeStats: defineTable({
    agentId: v.id("agents"),
    currentStakeAmount: v.number(),
    currentAccruedRewardSol: v.number(),
    lifetimeStakeAmount: v.number(),
    lifetimeRewardPaidSol: v.number(),
    lifetimePrincipalReturned: v.number(),
    activeStakeCount: v.number(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentId"]),

  stakePaymentReceipts: defineTable({
    stakeId: v.id("stakes"),
    txSignature: v.string(),
    fromWallet: v.string(),
    toWallet: v.string(),
    mint: v.string(),
    amountBaseUnits: v.string(),
    createdAt: v.number(),
  })
    .index("by_tx_signature", ["txSignature"])
    .index("by_stake", ["stakeId"]),

  payoutRequests: defineTable({
    stakeId: v.id("stakes"),
    agentId: v.id("agents"),
    evaluationId: v.id("evaluations"),
    requestedAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    principalAmount: v.number(),
    rewardAmountSol: v.number(),
    payoutTxId: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_stake", ["stakeId"])
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"]),

  xVerificationChallenges: defineTable({
    agentId: v.id("agents"),
    xHandle: v.string(),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("failed"), v.literal("expired")),
    createdAt: v.number(),
    expiresAt: v.number(),
    checkedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    tweetId: v.optional(v.string()),
    tweetUrl: v.optional(v.string()),
    failReason: v.optional(v.string()),
  })
    .index("by_agent_created", ["agentId", "createdAt"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),
});
