import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";
import EventTicketAbi from "./abi/EventTicket.json";
import MarketplaceAbi from "./abi/Marketplace.json";

const TICKET_ADDRESS = import.meta.env.VITE_TICKET_CONTRACT_ADDRESS;
const MARKET_ADDRESS = import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS;

function requireAddresses() {
  if (!TICKET_ADDRESS || TICKET_ADDRESS.startsWith("0x...")) {
    throw new Error("Chưa cấu hình VITE_TICKET_CONTRACT_ADDRESS");
  }
  if (!MARKET_ADDRESS || MARKET_ADDRESS.startsWith("0x...")) {
    throw new Error("Chưa cấu hình VITE_MARKETPLACE_CONTRACT_ADDRESS");
  }
}

export async function getSigner() {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask");
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export async function getTicketContract(signerOrProvider) {
  requireAddresses();
  return new Contract(TICKET_ADDRESS, EventTicketAbi, signerOrProvider);
}

export async function getMarketContract(signerOrProvider) {
  requireAddresses();
  return new Contract(MARKET_ADDRESS, MarketplaceAbi, signerOrProvider);
}

/** Mua vé sơ cấp (mint) */
export async function buyPrimaryTicket(eventChainId, priceEth) {
  const signer = await getSigner();
  const ticket = await getTicketContract(signer);
  const value = parseEther(String(priceEth));
  const tx = await ticket.mintTicket(eventChainId, value, { value });
  const receipt = await tx.wait();
  return { hash: receipt.hash, receipt };
}

/** Approve marketplace rồi list vé */
export async function listTicketForResale(tokenId, priceEth) {
  const signer = await getSigner();
  const ticket = await getTicketContract(signer);
  const market = await getMarketContract(signer);
  const approveTx = await ticket.approve(MARKET_ADDRESS, tokenId);
  await approveTx.wait();
  const price = parseEther(String(priceEth));
  const tx = await market.listTicket(tokenId, price);
  const receipt = await tx.wait();
  return { hash: receipt.hash, receipt };
}

export async function cancelListing(tokenId) {
  const signer = await getSigner();
  const market = await getMarketContract(signer);
  const tx = await market.cancelListing(tokenId);
  const receipt = await tx.wait();
  return { hash: receipt.hash, receipt };
}

export async function buyResaleTicket(tokenId, priceEth) {
  const signer = await getSigner();
  const market = await getMarketContract(signer);
  const value = parseEther(String(priceEth));
  const tx = await market.buyResaleTicket(tokenId, { value });
  const receipt = await tx.wait();
  return { hash: receipt.hash, receipt };
}

export async function readMaxAllowedPrice(tokenId) {
  const signer = await getSigner();
  const market = await getMarketContract(signer);
  const p = await market.getMaxAllowedPrice(tokenId);
  return formatEther(p);
}

export async function readUnlockTime(tokenId) {
  const signer = await getSigner();
  const market = await getMarketContract(signer);
  const t = await market.getUnlockTime(tokenId);
  return Number(t);
}

export async function readRemaining(eventChainId) {
  const signer = await getSigner();
  const ticket = await getTicketContract(signer);
  const n = await ticket.getRemainingTickets(eventChainId);
  return Number(n);
}

export { TICKET_ADDRESS, MARKET_ADDRESS, formatEther, parseEther };
