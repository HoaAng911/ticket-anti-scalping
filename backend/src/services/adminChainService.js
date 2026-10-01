import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { getProvider, getTicketContract } from "./blockchainService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DEPLOYER = "0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4";

function loadPassword() {
  if (process.env.GETH_PASSWORD) return process.env.GETH_PASSWORD;
  const p = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "blockchain",
    "private-net",
    "password.txt"
  );
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim();
  return "ticket123";
}

/**
 * Signer admin: ưu tiên DEPLOYER_PRIVATE_KEY, không thì unlock deployer trên geth.
 */
export async function getAdminSigner() {
  const provider = getProvider();
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  }

  const address = (process.env.DEPLOYER_ADDRESS || DEFAULT_DEPLOYER).toLowerCase();
  const password = loadPassword();
  try {
    await provider.send("personal_unlockAccount", [
      ethers.getAddress(address),
      password,
      300,
    ]);
  } catch (err) {
    throw new Error(
      `Không unlock được deployer trên geth: ${err.message}. Hãy bật node1 với --unlock deployer.`
    );
  }
  return provider.getSigner(ethers.getAddress(address));
}

export async function getFunderBalance() {
  const signer = await getAdminSigner();
  const addr = await signer.getAddress();
  const bal = await getProvider().getBalance(addr);
  return { address: addr.toLowerCase(), balanceEth: ethers.formatEther(bal) };
}

export async function fundAddresses(addresses, amountEth) {
  const signer = await getAdminSigner();
  const value = ethers.parseEther(String(amountEth));
  const results = [];

  for (const raw of addresses) {
    const to = ethers.getAddress(raw.trim());
    const tx = await signer.sendTransaction({ to, value });
    const receipt = await tx.wait();
    results.push({
      address: to.toLowerCase(),
      amountEth: String(amountEth),
      txHash: receipt.hash,
    });
  }
  return results;
}

export async function configureEventOnChain({ eventChainId, totalSupply, priceEth, name }) {
  const signer = await getAdminSigner();
  const ticket = getTicketContract().connect(signer);
  const priceWei = ethers.parseEther(String(priceEth));
  const tx = await ticket.configureEvent(
    Number(eventChainId),
    Number(totalSupply),
    priceWei,
    name || `Event ${eventChainId}`
  );
  const receipt = await tx.wait();
  return { txHash: receipt.hash, eventChainId: Number(eventChainId), priceEth: String(priceEth) };
}

export async function adminMintTickets(recipients, eventChainId) {
  const signer = await getAdminSigner();
  const ticket = getTicketContract().connect(signer);
  const addrs = recipients.map((a) => ethers.getAddress(a.trim()));

  const tipBefore = Number(await ticket.latestBlockIndex());

  let receipt;
  if (addrs.length === 1) {
    const tx = await ticket.adminMint(addrs[0], Number(eventChainId));
    receipt = await tx.wait();
  } else {
    const tx = await ticket.adminMintBatch(addrs, Number(eventChainId));
    receipt = await tx.wait();
  }

  const tipAfter = Number(await ticket.latestBlockIndex());
  const tipHash = await ticket.latestBlockHash();
  const chainValid =
    tipAfter > 0 ? await ticket.verifyChain(1, tipAfter) : true;

  // Mỗi vé mint = 1 TicketBlock node mới, prev → hash hiện tại
  const newBlocks = [];
  for (let i = tipBefore + 1; i <= tipAfter; i++) {
    const b = await ticket.getTicketBlockByIndex(i);
    newBlocks.push({
      index: Number(b.index),
      tokenId: Number(b.tokenId),
      eventChainId: Number(b.eventChainId),
      owner: b.owner.toLowerCase(),
      prevBlockHash: b.prevBlockHash,
      blockHash: b.blockHash,
      linkedToPrevious:
        i === 1
          ? b.prevBlockHash === ethers.ZeroHash
          : true,
    });
  }

  return {
    txHash: receipt.hash,
    count: addrs.length,
    recipients: addrs.map((a) => a.toLowerCase()),
    eventChainId: Number(eventChainId),
    chain: {
      tipBefore,
      tipAfter,
      latestBlockHash: tipHash,
      verifyChain: chainValid,
      newBlocks,
    },
  };
}

export function createRandomWallets(count) {
  const n = Math.min(50, Math.max(1, Number(count) || 1));
  const wallets = [];
  for (let i = 0; i < n; i++) {
    const w = ethers.Wallet.createRandom();
    wallets.push({
      address: w.address.toLowerCase(),
      privateKey: w.privateKey,
    });
  }
  return wallets;
}
