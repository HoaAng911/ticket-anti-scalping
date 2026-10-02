import { Interface, formatEther } from "ethers";
import EventTicketAbi from "../services/abi/EventTicket.json";
import MarketplaceAbi from "../services/abi/Marketplace.json";

const ticketIface = new Interface(EventTicketAbi);
const marketIface = new Interface(MarketplaceAbi);

const VI_MESSAGES = {
  PriceExceedsResaleCap: (args) => {
    const asked = args?.askedPrice != null ? formatEther(args.askedPrice) : "?";
    const max = args?.maxAllowedPrice != null ? formatEther(args.maxAllowedPrice) : "?";
    return `Giá đăng bán (${asked} ETH) vượt trần 110% giá gốc (tối đa ${max} ETH).`;
  },
  TransferLocked: (args) => {
    const t = args?.unlockTime != null ? Number(args.unlockTime) : null;
    const when = t ? new Date(t * 1000).toLocaleString("vi-VN") : "…";
    return `Vé còn trong thời gian khóa chuyển nhượng. Mở khóa lúc ${when}.`;
  },
  ListingInactive: () => "Listing không còn hiệu lực (đã bán hoặc đã hủy).",
  NotTicketOwner: () => "Bạn không phải chủ sở hữu vé này trên chain.",
  NotSeller: () => "Chỉ người đăng bán mới hủy được listing.",
  IncorrectPayment: (args) => {
    const exp = args?.expected != null ? formatEther(args.expected) : "?";
    const sent = args?.sent != null ? formatEther(args.sent) : "?";
    return `Số ETH gửi không khớp. Cần ${exp} ETH, đã gửi ${sent} ETH.`;
  },
  CannotBuyOwnListing: () => "Không thể tự mua listing của chính mình.",
  TooManyTicketsPerWallet: () => "Ví đã đạt tối đa 2 vé cho hạng sự kiện này.",
  SoldOut: () => "Hạng vé đã bán hết.",
  EventNotActive: () => "Hạng vé chưa active on-chain.",
  ZeroAddress: () => "Địa chỉ không hợp lệ (zero address).",
  InvalidConfig: () => "Cấu hình sự kiện không hợp lệ.",
  ERC721InsufficientApproval: () => "Marketplace chưa được approve để chuyển vé. Thử lại đăng bán.",
  ERC721IncorrectOwner: () => "Ví không còn sở hữu token này trên chain.",
};

function tryParse(iface, data) {
  try {
    return iface.parseError(data);
  } catch {
    return null;
  }
}

function extractRevertHex(err) {
  const seen = new Set();
  const queue = [err];
  while (queue.length) {
    const cur = queue.shift();
    if (cur == null || seen.has(cur)) continue;
    if (typeof cur === "string") {
      const m = cur.match(/0x[0-9a-fA-F]{8,}/);
      if (m && m[0].length >= 10) return m[0];
      continue;
    }
    if (typeof cur !== "object") continue;
    seen.add(cur);
    for (const key of Object.keys(cur)) {
      try {
        queue.push(cur[key]);
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

/**
 * Đổi lỗi ethers / MetaMask thành thông báo tiếng Việt rõ ràng.
 */
export function explainContractError(err) {
  if (!err) return "Lỗi không xác định";
  if (typeof err === "string") return err;

  const hex = extractRevertHex(err);
  let parsed = null;
  if (hex) {
    parsed = tryParse(marketIface, hex) || tryParse(ticketIface, hex);
  }

  if (!parsed && err.revert?.name) {
    parsed = { name: err.revert.name, args: err.revert.args || err.revert };
  }

  if (parsed?.name && VI_MESSAGES[parsed.name]) {
    try {
      return VI_MESSAGES[parsed.name](parsed.args);
    } catch {
      return `Contract revert: ${parsed.name}`;
    }
  }
  if (parsed?.name) return `Contract revert: ${parsed.name}`;

  const raw =
    err.shortMessage ||
    err.reason ||
    err.info?.error?.message ||
    err.error?.message ||
    err.message ||
    String(err);

  if (/user rejected|ACTION_REJECTED|denied transaction|User denied/i.test(raw)) {
    return "Bạn đã từ chối giao dịch trên MetaMask.";
  }

  if (/execution reverted/i.test(raw) && /unknown custom error/i.test(raw)) {
    return (
      "Giao dịch bị contract từ chối. " +
      "Với đăng bán: giá phải ≤ trần 110% giá gốc và đã hết thời gian khóa. " +
      "Kiểm tra «Trần resale» và «Mở khóa» trên thẻ vé."
    );
  }

  return raw;
}
