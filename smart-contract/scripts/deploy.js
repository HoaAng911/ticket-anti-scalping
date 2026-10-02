const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEPLOYER_ADDRESS = "0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4";

async function getDeployer() {
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    const [signer] = await hre.ethers.getSigners();
    return signer;
  }

  // Lab geth: dùng tài khoản đã unlock trên node (không cần export private key)
  const provider = new hre.ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const passwordPath = path.join(
    __dirname,
    "..",
    "..",
    "blockchain",
    "private-net",
    "password.txt"
  );
  const password = fs.existsSync(passwordPath)
    ? fs.readFileSync(passwordPath, "utf8").trim()
    : "ticket123";

  try {
    await provider.send("personal_unlockAccount", [DEPLOYER_ADDRESS, password, 600]);
    console.log("Unlocked deployer on geth:", DEPLOYER_ADDRESS);
  } catch (err) {
    console.warn("Unlock warning:", err.message);
  }

  return provider.getSigner(DEPLOYER_ADDRESS);
}

async function main() {
  const deployer = await getDeployer();
  const deployerAddress = await deployer.getAddress();
  const network = await hre.ethers.provider.getNetwork();
  console.log("Deployer:", deployerAddress);
  console.log("Network chainId:", network.chainId.toString());
  console.log(
    "Balance:",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployerAddress)),
    "ETH"
  );

  const isLocal =
    network.chainId === 12345n ||
    network.chainId === 31337n ||
    network.chainId === 31338n;
  const transferLockSeconds = isLocal ? 60 : 24 * 60 * 60;
  const treasury = deployerAddress;

  const EventTicket = await hre.ethers.getContractFactory("EventTicket", deployer);
  const ticket = await EventTicket.deploy(deployerAddress, treasury);
  await ticket.waitForDeployment();
  const ticketAddress = await ticket.getAddress();
  console.log("EventTicket:", ticketAddress);

  const Marketplace = await hre.ethers.getContractFactory("Marketplace", deployer);
  const market = await Marketplace.deploy(
    deployerAddress,
    ticketAddress,
    treasury,
    transferLockSeconds
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("Marketplace:", marketAddress);
  console.log("transferLockSeconds:", transferLockSeconds);

  const priceStd = hre.ethers.parseEther("0.01");
  const priceVip = hre.ethers.parseEther("0.05");
  await (await ticket.configureEvent(1, 100, priceStd, "Standard")).wait();
  await (await ticket.configureEvent(2, 20, priceVip, "VIP")).wait();
  console.log("Configured events: 1=Standard@0.01 ETH (100), 2=VIP@0.05 ETH (20)");

  const out = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    deployer: deployerAddress,
    transferLockSeconds,
    EventTicket: ticketAddress,
    Marketplace: marketAddress,
    sampleEvents: [
      { eventChainId: 1, name: "Standard", priceEth: "0.01", totalSupply: 100 },
      { eventChainId: 2, name: "VIP", priceEth: "0.05", totalSupply: 20 },
    ],
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log("Wrote", outFile);

  copyAbi("EventTicket");
  copyAbi("Marketplace");

  writeEnvHints(ticketAddress, marketAddress);

  console.log("\n--- .env hints ---");
  console.log(`TICKET_CONTRACT_ADDRESS=${ticketAddress}`);
  console.log(`MARKETPLACE_CONTRACT_ADDRESS=${marketAddress}`);
}

function copyAbi(name) {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${name}.sol`,
    `${name}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    console.warn("Missing artifact", artifactPath);
    return;
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const targets = [
    path.join(__dirname, "..", "..", "backend", "src", "abi", `${name}.json`),
    path.join(__dirname, "..", "..", "frontend", "src", "services", "abi", `${name}.json`),
  ];
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, JSON.stringify(artifact.abi, null, 2));
    console.log("Copied ABI ->", t);
  }
}

function upsertEnvFile(filePath, updates, defaults = "") {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : defaults;
  if (!content.trim()) content = defaults;
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content = content.trimEnd() + `\n${line}\n`;
    }
  }
  fs.writeFileSync(filePath, content.endsWith("\n") ? content : content + "\n");
}

function writeEnvHints(ticketAddress, marketAddress) {
  const backendEnv = path.join(__dirname, "..", "..", "backend", ".env");
  const frontendEnv = path.join(__dirname, "..", "..", "frontend", ".env");

  upsertEnvFile(
    backendEnv,
    {
      TICKET_CONTRACT_ADDRESS: ticketAddress,
      MARKETPLACE_CONTRACT_ADDRESS: marketAddress,
      CHAIN_ID: "12345",
      RPC_URL: "http://127.0.0.1:8545",
    },
    `PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/ticket-anti-scalping
JWT_SECRET=ticket-dev-secret-change-me
JWT_EXPIRES_IN=7d
NETWORK_NAME=ticket-private-clique
CHAIN_ID=12345
RPC_URL=http://127.0.0.1:8545
TICKET_CONTRACT_ADDRESS=${ticketAddress}
MARKETPLACE_CONTRACT_ADDRESS=${marketAddress}
DEPLOYER_ADDRESS=0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4
CLIENT_ORIGIN=http://localhost:5173
`
  );

  upsertEnvFile(
    frontendEnv,
    {
      VITE_TICKET_CONTRACT_ADDRESS: ticketAddress,
      VITE_MARKETPLACE_CONTRACT_ADDRESS: marketAddress,
      VITE_CHAIN_ID: "12345",
      VITE_RPC_URL: "http://127.0.0.1:8545",
    },
    `VITE_API_BASE_URL=/api
VITE_NETWORK_NAME=Ticket Private Clique
VITE_CHAIN_ID=12345
VITE_RPC_URL=http://127.0.0.1:8545
VITE_TICKET_CONTRACT_ADDRESS=${ticketAddress}
VITE_MARKETPLACE_CONTRACT_ADDRESS=${marketAddress}
`
  );

  console.log("Updated contract addresses in backend/.env and frontend/.env");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
