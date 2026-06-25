const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "IOPN\n");

  // 1. PriceOracle — initial OPN price $1.00 (8 decimals)
  console.log("[1/5] Deploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy(1_00000000n); // $1.00
  await oracle.waitForDeployment();
  console.log("PriceOracle:", await oracle.getAddress());

  // 2. CreditScore
  console.log("[2/5] Deploying CreditScore...");
  const CreditScore = await ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy();
  await creditScore.waitForDeployment();
  console.log("CreditScore:", await creditScore.getAddress());

  // 3. LendingPool
  console.log("[3/5] Deploying LendingPool...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    await oracle.getAddress(),
    await creditScore.getAddress()
  );
  await lendingPool.waitForDeployment();
  console.log("LendingPool:", await lendingPool.getAddress());

  // 4. LoanManager
  console.log("[4/5] Deploying LoanManager...");
  const LoanManager = await ethers.getContractFactory("LoanManager");
  const loanManager = await LoanManager.deploy(
    await lendingPool.getAddress(),
    await creditScore.getAddress()
  );
  await loanManager.waitForDeployment();
  console.log("LoanManager:", await loanManager.getAddress());

  // 5. Liquidator
  console.log("[5/5] Deploying Liquidator...");
  const Liquidator = await ethers.getContractFactory("Liquidator");
  const liquidator = await Liquidator.deploy(
    await lendingPool.getAddress(),
    await creditScore.getAddress()
  );
  await liquidator.waitForDeployment();
  console.log("Liquidator:", await liquidator.getAddress());

  // Wire permissions
  console.log("\nWiring permissions...");
  await creditScore.setLoanManager(await loanManager.getAddress());
  await creditScore.setLiquidator(await liquidator.getAddress());
  // LendingPool writes score on supply()/depositCollateral(), so it must be authorized too.
  await creditScore.setLendingPool(await lendingPool.getAddress());
  await lendingPool.setLoanManager(await loanManager.getAddress());
  await lendingPool.setLiquidator(await liquidator.getAddress());
  console.log("Done.");

  const summary = {
    oracle: await oracle.getAddress(),
    creditScore: await creditScore.getAddress(),
    lendingPool: await lendingPool.getAddress(),
    loanManager: await loanManager.getAddress(),
    liquidator: await liquidator.getAddress(),
    network: "opn_testnet",
    chainId: 984,
    deployedAt: new Date().toISOString(),
  };

  // Persist addresses so the keeper (seedTxCounts.js) and other scripts can find them.
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${network.name}.json`), JSON.stringify(summary, null, 2));

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nSaved to deployments/${network.name}.json`);
  console.log("\nPaste into frontend/.env.local:");
  console.log(`NEXT_PUBLIC_ORACLE_ADDRESS=${summary.oracle}`);
  console.log(`NEXT_PUBLIC_CREDIT_SCORE_ADDRESS=${summary.creditScore}`);
  console.log(`NEXT_PUBLIC_LENDING_POOL_ADDRESS=${summary.lendingPool}`);
  console.log(`NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=${summary.loanManager}`);
  console.log(`NEXT_PUBLIC_LIQUIDATOR_ADDRESS=${summary.liquidator}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
