import { BrowserProvider, Contract, JsonRpcProvider, parseEther, formatEther } from "ethers";
import EventTicketAbi from "./abi/EventTicket.json";
import MarketplaceAbi from "./abi/Marketplace.json";
import { explainContractError } from "../utils/contractErrors.js";

const TICKET_ADDRESS = import.meta.env.VITE_TICKET_CONTRACT_ADDRESS;
const MARKET_ADDRESS = import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS;
const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 12345);
const TARGET_HEX = "0x" + TARGET_CHAIN_ID.toString(16);
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || "Ticket Private Clique";

async function getReadProvider() {
  // Ưu tiên MetaMask provider để tránh CORS khi gọi RPC trực tiếp từ browser
  if (typeof window !== "undefined" && window.ethereum) {
    return new BrowserProvider(window.ethereum);
  }
  return new JsonRpcProvider(RPC_URL, TARGET_CHAIN_ID);
}

function requireAddresses() {
  if (!TICKET_ADDRESS || TICKET_ADDRESS.startsWith("0x...")) {
    throw new Error("Chưa cấu hình VITE_TICKET_CONTRACT_ADDRESS");
  }
  if (!MARKET_ADDRESS || MARKET_ADDRESS.startsWith("0x...")) {
    throw new Error("Chưa cấu hình VITE_MARKETPLACE_CONTRACT_ADDRESS");
  }
}

async function ensureWalletNetwork() {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: TARGET_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: TARGET_HEX,
            chainName: NETWORK_NAME,
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function getSigner() {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask");
  await ensureWalletNetwork();
  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== TARGET_CHAIN_ID) {
    throw new Error(`Sai mạng MetaMask. Cần chainId ${TARGET_CHAIN_ID} (${NETWORK_NAME}).`);
  }
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

/**
 * Mua vé sơ cấp (mint) — chỉ 1 eventChainId mỗi lần gọi.
 * Luôn lấy priceWei từ on-chain eventConfigs để tránh lệch float Mongo.
 */
export async function buyPrimaryTicket(eventChainId, priceEthHint) {
  const id = Number(eventChainId);
  if (!Number.isFinite(id) || id < 1) {
    throw new Error("eventChainId không hợp lệ");
  }
  const signer = await getSigner();
  const ticket = await getTicketContract(signer);
  const cfg = await ticket.eventConfigs(id);
  if (!cfg.active || cfg.totalSupply === 0n) {
    throw new Error(
      `Loại vé eventChainId=${id} chưa active on-chain. Vào Admin, mở mục Đồng bộ sự kiện lên chain.`
    );
  }
  let value = cfg.priceWei;
  if (!value || value === 0n) {
    if (priceEthHint == null) throw new Error("Không đọc được giá on-chain");
    value = parseEther(String(priceEthHint));
  }
  try {
    // Một lần gọi = một mintTicket đúng hạng được chọn
    const tx = await ticket.mintTicket(id, value, { value });
    const receipt = await tx.wait();

    let tokenId = null;
    try {
      for (const log of receipt.logs || []) {
        try {
          const parsed = ticket.interface.parseLog(log);
          if (parsed?.name === "TicketMinted") {
            tokenId = Number(parsed.args.tokenId);
            break;
          }
        } catch {
          /* not this contract */
        }
      }
    } catch {
      /* ignore */
    }

    return {
      hash: receipt.hash,
      receipt,
      priceWei: value.toString(),
      eventChainId: id,
      tokenId,
    };
  } catch (err) {
    throw new Error(explainContractError(err));
  }
}

/**
 * Approve marketplace rồi list vé.
 * Kiểm tra khóa chuyển nhượng + trần 110% trước khi gửi tx (tránh "unknown custom error").
 */
export async function listTicketForResale(tokenId, priceEth) {
  const priceStr = String(priceEth ?? "").trim();
  if (!priceStr || Number(priceStr) <= 0) {
    throw new Error("Nhập giá resale lớn hơn 0 (ETH)");
  }
  let price;
  try {
    price = parseEther(priceStr);
  } catch {
    throw new Error("Giá ETH không hợp lệ");
  }

  const reader = await getReadProvider();
  const marketRead = await getMarketContract(reader);
  const unlockAt = Number(await marketRead.getUnlockTime(tokenId));
  let chainNow;
  try {
    chainNow = Number((await reader.getBlock("latest")).timestamp);
  } catch {
    chainNow = Math.floor(Date.now() / 1000);
  }
  if (chainNow < unlockAt) {
    const when = new Date(unlockAt * 1000).toLocaleString("vi-VN");
    throw new Error(`Vé còn khóa chuyển nhượng đến ${when}.`);
  }
  const maxPrice = await marketRead.getMaxAllowedPrice(tokenId);
  if (price > maxPrice) {
    throw new Error(
      `Giá đăng bán (${formatEther(price)} ETH) vượt trần 110% giá gốc (tối đa ${formatEther(maxPrice)} ETH).`
    );
  }

  const signer = await getSigner();
  const ticket = await getTicketContract(signer);
  const market = await getMarketContract(signer);

  try {
    const approveTx = await ticket.approve(MARKET_ADDRESS, tokenId);
    await approveTx.wait();
    const tx = await market.listTicket(tokenId, price);
    const receipt = await tx.wait();
    return { hash: receipt.hash, receipt };
  } catch (err) {
    throw new Error(explainContractError(err));
  }
}

export async function cancelListing(tokenId) {
  try {
    const signer = await getSigner();
    const market = await getMarketContract(signer);
    const tx = await market.cancelListing(tokenId);
    const receipt = await tx.wait();
    return { hash: receipt.hash, receipt };
  } catch (err) {
    throw new Error(explainContractError(err));
  }
}

/**
 * Mua resale — ưu tiên priceWei on-chain từ listing để khớp msg.value chính xác.
 * @param {number|string} tokenId
 * @param {string|number|null} priceEthFallback — chỉ dùng nếu không đọc được listing
 * @param {string|null} priceWeiHint — wei string từ API nếu có
 */
export async function buyResaleTicket(tokenId, priceEthFallback, priceWeiHint = null) {
  const signer = await getSigner();
  const market = await getMarketContract(signer);
  const listing = await market.getListing(tokenId);
  if (!listing.active) {
    throw new Error("Listing không còn active on-chain (đã bán hoặc đã hủy).");
  }
  let value = listing.price;
  if (!value || value === 0n) {
    if (priceWeiHint) {
      value = BigInt(priceWeiHint);
    } else if (priceEthFallback != null) {
      value = parseEther(String(priceEthFallback));
    } else {
      throw new Error("Không xác định được giá listing");
    }
  }
  try {
    const tx = await market.buyResaleTicket(tokenId, { value });
    const receipt = await tx.wait();
    return { hash: receipt.hash, receipt, priceWei: value.toString() };
  } catch (err) {
    throw new Error(explainContractError(err));
  }
}

export async function readMaxAllowedPrice(tokenId) {
  const market = await getMarketContract(await getReadProvider());
  const p = await market.getMaxAllowedPrice(tokenId);
  return formatEther(p);
}

export async function readUnlockTime(tokenId) {
  const market = await getMarketContract(await getReadProvider());
  const t = await market.getUnlockTime(tokenId);
  return Number(t);
}

export async function readRemaining(eventChainId) {
  const ticket = await getTicketContract(await getReadProvider());
  const n = await ticket.getRemainingTickets(eventChainId);
  return Number(n);
}

export { TICKET_ADDRESS, MARKET_ADDRESS, formatEther, parseEther };
