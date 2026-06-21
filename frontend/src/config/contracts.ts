export const CONTRACTS = {
  lendingPool:  (process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS  || "") as `0x${string}`,
  loanManager:  (process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS  || "") as `0x${string}`,
  creditScore:  (process.env.NEXT_PUBLIC_CREDIT_SCORE_ADDRESS  || "") as `0x${string}`,
  oracle:       (process.env.NEXT_PUBLIC_ORACLE_ADDRESS        || "") as `0x${string}`,
  liquidator:   (process.env.NEXT_PUBLIC_LIQUIDATOR_ADDRESS    || "") as `0x${string}`,
};

export const LENDING_POOL_ABI = [
  { name: "supply",            type: "function", stateMutability: "payable",    inputs: [],                                                    outputs: [] },
  { name: "withdrawSupply",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "shareAmount", type: "uint256" }],            outputs: [] },
  { name: "claimYield",        type: "function", stateMutability: "nonpayable", inputs: [],                                                    outputs: [] },
  { name: "depositCollateral", type: "function", stateMutability: "payable",    inputs: [],                                                    outputs: [] },
  { name: "withdrawCollateral",type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],                 outputs: [] },
  { name: "totalSupplied",     type: "function", stateMutability: "view",       inputs: [],                                                    outputs: [{ type: "uint256" }] },
  { name: "totalBorrowed",     type: "function", stateMutability: "view",       inputs: [],                                                    outputs: [{ type: "uint256" }] },
  { name: "totalCollateral",   type: "function", stateMutability: "view",       inputs: [],                                                    outputs: [{ type: "uint256" }] },
  { name: "availableLiquidity",type: "function", stateMutability: "view",       inputs: [],                                                    outputs: [{ type: "uint256" }] },
  { name: "utilisationBps",   type: "function", stateMutability: "view",       inputs: [],                                                    outputs: [{ type: "uint256" }] },
  { name: "supplyAprBps",     type: "function", stateMutability: "view",       inputs: [],                                                    outputs: [{ type: "uint256" }] },
  { name: "borrowAprBps",     type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],                   outputs: [{ type: "uint256" }] },
  { name: "borrowLimit",      type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],                   outputs: [{ type: "uint256" }] },
  { name: "healthFactor",     type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],                   outputs: [{ type: "uint256" }] },
  { name: "getPosition",      type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "collateral", type: "uint256" }, { name: "debt", type: "uint256" }, { name: "limit", type: "uint256" }, { name: "hf", type: "uint256" }, { name: "aprBps", type: "uint256" }] },
  { name: "getSupplyInfo",    type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "supplied", type: "uint256" }, { name: "shares", type: "uint256" }, { name: "yieldEarned", type: "uint256" }, { name: "aprBps", type: "uint256" }] },
  { name: "Supplied",          type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }, { name: "shares", type: "uint256" }] },
  { name: "SupplyWithdrawn",   type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
  { name: "YieldClaimed",      type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
  { name: "Borrowed",          type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
  { name: "Repaid",            type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
  { name: "Liquidated",        type: "event", inputs: [{ name: "borrower", type: "address", indexed: true }, { name: "liquidator", type: "address", indexed: true }, { name: "debtRepaid", type: "uint256" }, { name: "collateralSeized", type: "uint256" }] },
  { name: "CollateralDeposited", type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
  { name: "YieldClaimed", type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
] as const;

export const LOAN_MANAGER_ABI = [
  { name: "borrow", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "repay",  type: "function", stateMutability: "payable",    inputs: [],                                    outputs: [] },
] as const;

export const CREDIT_SCORE_ABI = [
  { name: "getScore",           type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getTier",            type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "uint8" }] },
  { name: "getBorrowMultiplierBps", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getAprSurchargeBps", type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }], outputs: [{ type: "int256" }] },
  { name: "getScoreBreakdown",  type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "baseline", type: "uint256" }, { name: "activeWalletBonus", type: "uint256" }, { name: "repaymentBonus", type: "uint256" }, { name: "longtermBonus", type: "uint256" }, { name: "liquidationPenalty", type: "uint256" }, { name: "total", type: "uint256" }] },
  { name: "getWalletData",      type: "function", stateMutability: "view", inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "txCount", type: "uint256" }, { name: "firstSeenTimestamp", type: "uint256" }, { name: "totalRepayments", type: "uint256" }, { name: "liquidations", type: "uint256" }, { name: "lastUpdated", type: "uint256" }, { name: "initialized", type: "bool" }] },
] as const;

export const ORACLE_ABI = [
  { name: "getPrice",  type: "function", stateMutability: "view",       inputs: [],                               outputs: [{ type: "uint256" }] },
  { name: "opnToUsd",  type: "function", stateMutability: "view",       inputs: [{ name: "opnAmount", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "setPrice",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "_price", type: "uint256" }], outputs: [] },
] as const;

export const LIQUIDATOR_ABI = [
  { name: "liquidate",       type: "function", stateMutability: "payable", inputs: [{ name: "borrower", type: "address" }], outputs: [] },
  { name: "isLiquidatable",  type: "function", stateMutability: "view",    inputs: [{ name: "borrower", type: "address" }], outputs: [{ type: "bool" }] },
] as const;

// Tier helpers
export const TIER_LABELS = ["High Risk", "Subprime", "Neutral", "Prime"] as const;
export const TIER_CLASSES = ["tier-high-risk", "tier-subprime", "tier-neutral", "tier-prime"] as const;
export const TIER_MULTIPLIERS = ["×0.5", "×0.75", "×1", "×1.5"] as const;
export const TIER_APR_LABELS = ["+8.0%", "+3.0%", "base", "-2.0%"] as const;

export function tierLabel(tier: number) { return TIER_LABELS[tier] ?? "Unknown"; }
export function tierClass(tier: number) { return TIER_CLASSES[tier] ?? "tier-neutral"; }
export function tierMultiplier(tier: number) { return TIER_MULTIPLIERS[tier] ?? "×1"; }

export function formatOPN(wei: bigint, decimals = 4) {
  const val = Number(wei) / 1e18;
  return val.toFixed(decimals);
}

export function formatUsd(raw: bigint, decimals = 2) {
  const val = Number(raw) / 1e8;
  return val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatHF(hf: bigint) {
  if (hf === BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")) return "∞";
  return (Number(hf) / 1e18).toFixed(2);
}

export function shortenAddress(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}
