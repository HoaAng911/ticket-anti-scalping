import { useEffect, useState } from "react";
import { Ticket, Wallet, Tag, Ban, AlertCircle, CheckCircle2, Link2 } from "lucide-react";
import { getMyTickets, getTicketHistory } from "../services/api.js";
import {
  listTicketForResale,
  cancelListing,
  readMaxAllowedPrice,
  readUnlockTime,
} from "../services/contract.js";
import { useWallet } from "../hooks/useWallet.js";

function shortHash(h) {
  if (!h) return "—";
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function ethersZero() {
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
}

export default function MyTickets() {
  const { account, connect, wrongNetwork, ensureNetwork } = useWallet();
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState(null);
  const [prices, setPrices] = useState({});
  const [meta, setMeta] = useState({});

  async function load() {
    if (!account) return;
    const data = await getMyTickets(account);
    setTickets(data.tickets || []);
    const m = {};
    for (const t of data.tickets || []) {
      try {
        const [maxP, unlock, history] = await Promise.all([
          readMaxAllowedPrice(t.tokenId).catch(() => null),
          readUnlockTime(t.tokenId).catch(() => null),
          getTicketHistory(t.tokenId).catch(() => null),
        ]);
        m[t.tokenId] = { maxP, unlock, history };
      } catch {
        /* ignore */
      }
    }
    setMeta(m);
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.response?.data?.error || e.message));
  }, [account]);

  async function onList(tokenId) {
    setMsg(null);
    try {
      if (wrongNetwork) await ensureNetwork();
      const price = prices[tokenId];
      if (!price) throw new Error("Nhập giá resale (ETH)");
      const { hash } = await listTicketForResale(tokenId, price);
      setMsg(`Đã đăng bán. Tx: ${hash}`);
      await load();
    } catch (e) {
      setMsg(e.shortMessage || e.message || String(e));
    }
  }

  async function onCancel(tokenId) {
    setMsg(null);
    try {
      const { hash } = await cancelListing(tokenId);
      setMsg(`Đã hủy listing. Tx: ${hash}`);
      await load();
    } catch (e) {
      setMsg(e.shortMessage || e.message || String(e));
    }
  }

  if (!account) {
    return (
      <>
        <div className="user-hero">
          <div>
            <h1>Vé của tôi</h1>
            <p>Kết nối MetaMask để xem và quản lý vé NFT.</p>
          </div>
        </div>
        <div className="user-empty">
          <Wallet size={40} />
          <p>Chưa nối ví</p>
          <button type="button" className="user-btn" onClick={connect} style={{ marginTop: 12 }}>
            <Wallet size={16} /> Kết nối MetaMask
          </button>
        </div>
      </>
    );
  }

  const msgOk = msg && msg.includes("Tx");

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>Vé của tôi</h1>
          <p>Đăng bán resale ≤ 110% giá gốc, sau thời gian khóa.</p>
        </div>
      </div>

      {msg && (
        <div className={`user-alert ${msgOk ? "ok" : "err"}`}>
          {msgOk ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg}
        </div>
      )}

      <section className="user-section">
        <div className="user-ticket-list">
          {tickets.map((t) => {
            const info = meta[t.tokenId] || {};
            const unlockDate = info.unlock
              ? new Date(info.unlock * 1000).toLocaleString("vi-VN")
              : "…";
            return (
              <article key={t.tokenId} className="user-ticket">
                <div className="user-ticket-icon">
                  <Ticket size={22} />
                </div>
                <div>
                  <h3>
                    Token #{t.tokenId} · {t.status}
                  </h3>
                  <p>{t.event?.title || `eventChainId ${t.eventChainId}`}</p>
                  <p>
                    Giá gốc {t.originalPrice} ETH · mint{" "}
                    {new Date(t.mintedAt).toLocaleString("vi-VN")}
                  </p>
                  {t.blockIndex != null && (
                    <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Link2 size={13} /> TicketBlock #{t.blockIndex}
                      {t.prevBlockHash && t.prevBlockHash !== ethersZero()
                        ? ` · prev ${shortHash(t.prevBlockHash)}`
                        : " · genesis"}
                      {t.blockHash ? ` · hash ${shortHash(t.blockHash)}` : ""}
                    </p>
                  )}
                  <p>
                    Trần resale: {info.maxP ?? "…"} ETH · Mở khóa: {unlockDate}
                  </p>
                </div>
                <div className="user-ticket-actions">
                  {t.status === "owned" && (
                    <>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="Giá ETH"
                        value={prices[t.tokenId] || ""}
                        onChange={(e) =>
                          setPrices((p) => ({ ...p, [t.tokenId]: e.target.value }))
                        }
                      />
                      <button type="button" className="user-btn" onClick={() => onList(t.tokenId)}>
                        <Tag size={15} /> Đăng bán
                      </button>
                    </>
                  )}
                  {t.status === "listed_for_resale" && (
                    <button type="button" className="user-btn danger" onClick={() => onCancel(t.tokenId)}>
                      <Ban size={15} /> Hủy ({t.listingPrice} ETH)
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!tickets.length && (
            <div className="user-empty">
              <Ticket size={40} />
              <p>Chưa có vé trong cache. Hãy mint ở trang sự kiện.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
