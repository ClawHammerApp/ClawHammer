export function parsePaymentSignatureHeader(raw: string): { stakeId: string; txSignature: string; stakingWallet: string } {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid PAYMENT-SIGNATURE JSON");
  }

  const stakeId = String(parsed?.stakeId ?? "");
  const txSignature = String(parsed?.txSignature ?? parsed?.signature ?? "");
  const stakingWallet = String(parsed?.stakingWallet ?? "");

  if (!stakeId || !txSignature || !stakingWallet) {
    throw new Error("PAYMENT-SIGNATURE must include stakeId, txSignature, stakingWallet");
  }

  return { stakeId, txSignature, stakingWallet };
}

export function txIncludesSigner(tx: any, wallet: string): boolean {
  for (const k of tx?.transaction?.message?.accountKeys ?? []) {
    const pubkey = typeof k === "string" ? k : String(k?.pubkey ?? "");
    const signer = typeof k === "string" ? false : Boolean(k?.signer);
    if (pubkey === wallet && signer) return true;
  }
  return false;
}

export function sumVaultMintIncreaseBaseUnits(tx: any, vaultWallet: string, mint: string): bigint {
  const pre = new Map<string, bigint>();
  const post = new Map<string, bigint>();

  for (const b of tx?.meta?.preTokenBalances ?? []) {
    if (String(b?.mint) !== mint) continue;
    if (String(b?.owner ?? "") !== vaultWallet) continue;
    const key = `${b.accountIndex}`;
    pre.set(key, BigInt(String(b?.uiTokenAmount?.amount ?? "0")));
  }

  for (const b of tx?.meta?.postTokenBalances ?? []) {
    if (String(b?.mint) !== mint) continue;
    if (String(b?.owner ?? "") !== vaultWallet) continue;
    const key = `${b.accountIndex}`;
    post.set(key, BigInt(String(b?.uiTokenAmount?.amount ?? "0")));
  }

  const keys = new Set([...pre.keys(), ...post.keys()]);
  let delta = 0n;
  for (const key of keys) {
    const before = pre.get(key) ?? 0n;
    const after = post.get(key) ?? 0n;
    if (after > before) delta += (after - before);
  }

  return delta;
}
