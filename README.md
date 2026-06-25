# OPNLend | Reputation-Weighted Lending on OPN Chain

Borrow against your on-chain reputation, not just your collateral.
**OPN Builders Programme - Season 1: DeFi & Open Finance**.

---

## How it works

Every wallet has a credit score (0–1000) computed from on-chain activity:
tx count, wallet age, and protocol behaviour (supplies, deposits, borrows,
repayments, liquidations). Your score places you in a tier that multiplies your
borrowing power and adjusts your APR.

**Scoring**

| Signal                     | Points        |
|----------------------------|---------------|
| Baseline                   | +200          |
| Active wallet (tx ≥ 10)    | +25           |
| Loan repayment             | +20 each      |
| Supply                     | +10 each      |
| Collateral deposit         | +10 each      |
| Borrow                     | +10 each      |
| Yield claim                | +0            |
| Long-term wallet (≥ 180d)  | +25           |
| Liquidation                | −200 each     |

**Tiers**

| Tier      | Score    | Borrow Multiplier | APR Adjustment |
|-----------|----------|--------------------|-----------------|
| Prime     | 1000     | ×1.5               | −2.0%           |
| Neutral   | 320–999  | ×1.0               | base            |
| Subprime  | 250–319  | ×0.75              | +3.0%           |
| High Risk | 0–249    | ×0.5               | +8.0%           |

```
effectiveBorrowLimit = collateral × 75% (CF) × repMultiplier
borrowAPR = 4.38% base + utilisation risk + reputation surcharge
liquidationThreshold = 83%   liquidationBonus = 8%
```

---

## Contracts

| Contract         | Responsibility                                               |
|------------------|--------------------------------------------------------------|
| `PriceOracle.sol`| Manually-set IOPN/USD price feed (testnet)                   |
| `CreditScore.sol`| Computes reputation score + tier from on-chain wallet data   |
| `LendingPool.sol`| Supply, collateral, borrow, repay, liquidation accounting    |
| `LoanManager.sol`| Entry point for borrow/repay, wires CreditScore updates      |
| `Liquidator.sol` | Entry point for liquidating unhealthy positions              |

---


## generate cron_secret
```bash
openssl rand -hex 16

```

## Setup

### 1. Contracts

```bash
npm install
cp .env.example .env
# Add your burner wallet's private key to .env

npx hardhat run scripts/deploy.js --network opn_testnet
```

Copy the 5 printed addresses into `frontend/.env.local`.

### 2. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.local.example .env.local
# Add WalletConnect project ID + the 5 contract addresses

npm run dev   # http://localhost:3000
```

---

## Network details (OPN Chain Testnet)

| Field          | Value                               |
|----------------|-------------------------------------|
| Chain ID       | 984                                 |
| RPC URL        | https://testnet-rpc.iopn.tech       |
| Currency       | IOPN                                |
| Block Explorer | https://testnet.iopn.tech           |

Add this network to your wallet manually if it isn't added automatically when you connect.

---

## Pages

- `/` - landing page, protocol overview
- `/dashboard` - supply, collateral, borrow/repay, liquidations
- `/profile` - your credit score, breakdown, and reputation simulator
- `/leaderboard` - all wallets ranked by score (discovered from on-chain event on OPLEND)
- `/activity` - live protocol event feed
- `/stats` - complete protocol stats / no button leads to this page, not visible to users, only protocol admins hits this route ( protocol txns  monitoring)

