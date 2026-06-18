// Keeper: seed each OPNLend user's real OPN-chain transaction count (wallet nonce)
// into CreditScore.seedTxCount, so the on-chain credit score reflects all of a
// wallet's chain activity — not just protocol actions.
//
// Run periodically with the owner key:
//   npx hardhat run scripts/seedTxCounts.js --network opn_testnet
//
// Addresses are read from deployments/<network>.json (written by deploy.js) or
// from CREDIT_SCORE_ADDRESS / LENDING_POOL_ADDRESS env vars as an override.

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadAddresses() {
  const fromEnv = {
    creditScore: process.env.CREDIT_SCORE_ADDRESS,
    lendingPool: process.env.LENDING_POOL_ADDRESS,
  };
  if (fromEnv.creditScore && fromEnv.lendingPool) return fromEnv;

  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));

  throw new Error(
    "No addresses found. Run deploy.js first, or set CREDIT_SCORE_ADDRESS and LENDING_POOL_ADDRESS."
  );
}

async function main() {
  const { creditScore: csAddr, lendingPool: poolAddr } = loadAddresses();
  const [keeper] = await ethers.getSigners();
  console.log("Keeper:", keeper.address);
  console.log("CreditScore:", csAddr);

  const pool = await ethers.getContractAt("LendingPool", poolAddr);
  const creditScore = await ethers.getContractAt("CreditScore", csAddr);

  // Discover every wallet that has touched OPNLend.
  const eventNames = ["Supplied", "Borrowed", "Repaid", "CollateralDeposited", "Liquidated"];
  const wallets = new Set();
  for (const name of eventNames) {
    const logs = await pool.queryFilter(pool.filters[name](), 0, "latest");
    for (const log of logs) {
      const a = log.args;
      if (a.user) wallets.add(ethers.getAddress(a.user));
      if (a.borrower) wallets.add(ethers.getAddress(a.borrower));
      if (a.liquidator) wallets.add(ethers.getAddress(a.liquidator));
    }
  }

  if (wallets.size === 0) {
    console.log("No OPNLend users discovered yet — nothing to seed.");
    return;
  }
  console.log(`Discovered ${wallets.size} wallet(s). Seeding tx counts...\n`);

  for (const wallet of wallets) {
    // Nonce == number of transactions the wallet has sent on this chain.
    const txCount = await ethers.provider.getTransactionCount(wallet);
    const stored = await creditScore.getWalletData(wallet);
    if (Number(stored.txCount) === txCount) {
      console.log(`  ${wallet}  tx=${txCount}  (unchanged, skipped)`);
      continue;
    }
    // firstSeenTimestamp = 0 keeps the existing value (seedTxCount only lowers it).
    const tx = await creditScore.seedTxCount(wallet, txCount, 0);
    await tx.wait();
    console.log(`  ${wallet}  tx=${txCount}  (seeded)`);
  }

  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
