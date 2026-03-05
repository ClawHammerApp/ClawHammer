import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePaymentSignatureHeader, sumVaultMintIncreaseBaseUnits } from "./stakingVerify";

test("parsePaymentSignatureHeader parses required fields", () => {
  const parsed = parsePaymentSignatureHeader(
    JSON.stringify({ stakeId: "stk_1", txSignature: "abc123", stakingWallet: "wallet1" })
  );

  assert.equal(parsed.stakeId, "stk_1");
  assert.equal(parsed.txSignature, "abc123");
  assert.equal(parsed.stakingWallet, "wallet1");
});

test("sumVaultMintIncreaseBaseUnits computes positive vault delta", () => {
  const tx: any = {
    meta: {
      preTokenBalances: [
        { accountIndex: 1, mint: "MINT", owner: "VAULT", uiTokenAmount: { amount: "100" } },
      ],
      postTokenBalances: [
        { accountIndex: 1, mint: "MINT", owner: "VAULT", uiTokenAmount: { amount: "350" } },
      ],
    },
  };

  const delta = sumVaultMintIncreaseBaseUnits(tx, "VAULT", "MINT");
  assert.equal(delta.toString(), "250");
});
