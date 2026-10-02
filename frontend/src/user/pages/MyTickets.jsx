import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Wallet,
  Tag,
  Ban,
  AlertCircle,
  CheckCircle2,
  Link2,
  FileText,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getMyTickets, getTicketHistory, getInvoiceByTokenId } from "../../services/api.js";
import {
  listTicketForResale,
  cancelListing,
  readMaxAllowedPrice,
  readUnlockTime,
} from "../../services/contract.js";
import { useWallet } from "../../hooks/useWallet.js";
import { downloadInvoicePdfById, openInvoicePdfById } from "../../utils/invoicePdf.js";
import { explainContractError } from "../../utils/contractErrors.js";

function shortHash(h) {
  if (!h) return "—";
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function ethersZero() {
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
}

function moneyEth(n) {
  const v = Number(n) || 0;
  if (v === 0) return "0 ETH";
  return `${v.toFixed(6).replace(/\.?0+$/, "")} ETH`;
}

function normalizeEthInput(v) {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return "";
  // Giữ đủ số thập phân cho trần kiểu 0.011
  return String(v).trim();
}

export default function MyTickets() {
  const { account, connect, ensureNetwork } = useWallet();
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState(null);
  const [prices, setPrices] = useState({});
  const [meta, setMeta] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [invoiceByToken, setInvoiceByToken] = useState({});
  const [busyInvoice, setBusyInvoice] = useState(null);
  const [busyList, setBusyList] = useState(null);

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
    // Mặc định giá = trần 110% nếu user chưa nhập
    setPrices((prev) => {
      const next = { ...prev };
      for (const t of data.tickets || []) {
        if ((next[t.tokenId] == null || next[t.tokenId] === "") && m[t.tokenId]?.maxP) {
          next[t.tokenId] = m[t.tokenId].maxP;
        }
      }
      return next;
    });
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.response?.data?.error || e.message));
  }, [account]);

  async function loadInvoiceForToken(tokenId) {
    const cached = invoiceByToken[tokenId];
    if (cached?.id) return;
    try {
      const inv = await getInvoiceByTokenId(tokenId);
      setInvoiceByToken((prev) => ({ ...prev, [tokenId]: { ...inv, _loaded: true } }));
    } catch {
      setInvoiceByToken((prev) => ({
        ...prev,
        [tokenId]: { _loaded: true, missing: true },
      }));
    }
  }

  async function onSelectTicket(tokenId) {
    const next = selectedId === tokenId ? null : tokenId;
    setSelectedId(next);
    if (next != null) await loadInvoiceForToken(next);
  }

  async function onViewInvoice(tokenId) {
    setMsg(null);
    setBusyInvoice(tokenId);
    try {
      let inv = invoiceByToken[tokenId];
      if (!inv?.id) {
        inv = await getInvoiceByTokenId(tokenId);
        setInvoiceByToken((prev) => ({ ...prev, [tokenId]: { ...inv, _loaded: true } }));
      }
      if (!inv?.id) throw new Error("Không có hóa đơn");
      const { popupBlocked } = await openInvoicePdfById(inv.id);
      if (popupBlocked) {
        setMsg("Popup bị chặn — dùng Tải PDF hoặc cho phép popup.");
      } else if (inv.backfilled) {
        setMsg(`Đã mở hóa đơn bổ sung ${inv.invoiceNo} (tạo từ dữ liệu vé trên ledger).`);
      }
    } catch (e) {
      setMsg(e.response?.data?.error || e.message || String(e));
      setInvoiceByToken((prev) => ({
        ...prev,
        [tokenId]: { _loaded: true, missing: true },
      }));
    } finally {
      setBusyInvoice(null);
    }
  }

  async function onDownloadInvoice(tokenId) {
    setBusyInvoice(tokenId);
    try {
      let inv = invoiceByToken[tokenId];
      if (!inv?.id) {
        inv = await getInvoiceByTokenId(tokenId);
        setInvoiceByToken((prev) => ({ ...prev, [tokenId]: { ...inv, _loaded: true } }));
      }
      await downloadInvoicePdfById(inv.id, `${inv.invoiceNo || "invoice"}.pdf`);
    } catch (e) {
      setMsg(e.response?.data?.error || e.message || String(e));
    } finally {
      setBusyInvoice(null);
    }
  }

  async function onList(tokenId) {
    setMsg(null);
    setBusyList(tokenId);
    try {
      await ensureNetwork();
      const info = meta[tokenId] || {};
      const nowSec = Math.floor(Date.now() / 1000);
      if (info.unlock && nowSec < info.unlock) {
        throw new Error(
          `Vé còn khóa chuyển nhượng đến ${new Date(info.unlock * 1000).toLocaleString("vi-VN")}.`
        );
      }
      const price = normalizeEthInput(prices[tokenId]);
      if (!price) throw new Error("Nhập giá resale (ETH)");
      if (info.maxP != null && Number(price) > Number(info.maxP) + 1e-12) {
        throw new Error(
          `Giá đăng bán (${price} ETH) vượt trần 110% (tối đa ${info.maxP} ETH).`
        );
      }
      const { hash } = await listTicketForResale(tokenId, price);
      setMsg(`Đã đăng bán. Tx: ${hash}`);
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const data = await getMyTickets(account);
        setTickets(data.tickets || []);
        const updated = (data.tickets || []).find((x) => x.tokenId === tokenId);
        if (updated?.status === "listed_for_resale") break;
      }
    } catch (e) {
      setMsg(explainContractError(e));
    } finally {
      setBusyList(null);
    }
  }

  async function onCancel(tokenId) {
    setMsg(null);
    setBusyList(tokenId);
    try {
      await ensureNetwork();
      const { hash } = await cancelListing(tokenId);
      setMsg(`Đã hủy listing. Tx: ${hash}`);
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const data = await getMyTickets(account);
        setTickets(data.tickets || []);
        const updated = (data.tickets || []).find((x) => x.tokenId === tokenId);
        if (updated?.status === "owned") break;
      }
    } catch (e) {
      setMsg(explainContractError(e));
    } finally {
      setBusyList(null);
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

  const msgOk = msg && (msg.includes("Tx") || msg.includes("Đã"));

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>Vé của tôi</h1>
          <p>
            Bấm vào vé để xem chi tiết và hóa đơn GTGT.{" "}
            <Link to="/my-invoices">Tất cả hóa đơn</Link>
          </p>
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
            const locked =
              info.unlock != null && Math.floor(Date.now() / 1000) < info.unlock;
            const open = selectedId === t.tokenId;
            const inv = invoiceByToken[t.tokenId];
            const priceVal = prices[t.tokenId] || "";
            const overCap =
              info.maxP != null &&
              priceVal !== "" &&
              Number(priceVal) > Number(info.maxP) + 1e-12;
            return (
              <article
                key={t.tokenId}
                className={`user-ticket${open ? " is-open" : ""}`}
                style={{ cursor: "pointer" }}
              >
                <button
                  type="button"
                  className="user-ticket-select"
                  onClick={() => onSelectTicket(t.tokenId)}
                  style={{
                    display: "contents",
                    textAlign: "left",
                    color: "inherit",
                    background: "none",
                    border: 0,
                    font: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <div className="user-ticket-icon">
                    <Ticket size={22} />
                  </div>
                  <div>
                    <h3>
                      Token #{t.tokenId} · {t.status}{" "}
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                      {locked ? " · đang khóa" : ""}
                    </p>
                  </div>
                </button>
                <div className="user-ticket-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="user-btn secondary"
                    disabled={busyInvoice === t.tokenId}
                    onClick={() => onViewInvoice(t.tokenId)}
                  >
                    <FileText size={15} /> Hóa đơn
                  </button>
                  {t.status === "owned" && (
                    <>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max={info.maxP != null ? Number(info.maxP) : undefined}
                        placeholder={info.maxP ? `≤ ${info.maxP}` : "Giá ETH"}
                        title={
                          info.maxP
                            ? `Tối đa ${info.maxP} ETH (110% giá gốc)`
                            : "Giá resale (ETH)"
                        }
                        value={priceVal}
                        onChange={(e) =>
                          setPrices((p) => ({ ...p, [t.tokenId]: e.target.value }))
                        }
                        aria-invalid={overCap || undefined}
                        style={
                          overCap
                            ? { outline: "1px solid #e74c3c", borderColor: "#e74c3c" }
                            : undefined
                        }
                      />
                      <button
                        type="button"
                        className="user-btn"
                        disabled={busyList === t.tokenId || locked || overCap || !priceVal}
                        title={
                          locked
                            ? `Còn khóa đến ${unlockDate}`
                            : overCap
                              ? `Giá vượt trần ${info.maxP} ETH`
                              : "Đăng bán lên marketplace"
                        }
                        onClick={() => onList(t.tokenId)}
                      >
                        <Tag size={15} /> {busyList === t.tokenId ? "…" : "Đăng bán"}
                      </button>
                    </>
                  )}
                  {t.status === "listed_for_resale" && (
                    <button
                      type="button"
                      className="user-btn danger"
                      disabled={busyList === t.tokenId}
                      onClick={() => onCancel(t.tokenId)}
                    >
                      <Ban size={15} /> Hủy ({t.listingPrice} ETH)
                    </button>
                  )}
                </div>

                {open && (
                  <div
                    className="user-ticket-detail"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      gridColumn: "1 / -1",
                      marginTop: "0.75rem",
                      padding: "0.85rem 1rem",
                      borderTop: "1px solid var(--u-border)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText size={16} /> Hóa đơn mua vé
                      </strong>
                      {inv?.missing ? (
                        <p className="user-meta" style={{ margin: "0.35rem 0 0" }}>
                          Chưa tìm thấy hóa đơn PDF cho token này (vé mint trước khi bật lưu hóa đơn,
                          hoặc admin mint).
                        </p>
                      ) : inv?.id ? (
                        <p className="user-meta" style={{ margin: "0.35rem 0 0" }}>
                          {inv.invoiceNo} · GTGT {moneyEth(inv.vatAmount)} · Tổng{" "}
                          {moneyEth(inv.amountGross)} ·{" "}
                          {inv.issuedAt ? new Date(inv.issuedAt).toLocaleString("vi-VN") : ""}
                        </p>
                      ) : (
                        <p className="user-meta" style={{ margin: "0.35rem 0 0" }}>
                          Đang tìm hóa đơn…
                        </p>
                      )}
                    </div>
                    {inv?.id && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="user-btn"
                          disabled={busyInvoice === t.tokenId}
                          onClick={() => onViewInvoice(t.tokenId)}
                        >
                          <Eye size={15} /> Xem / in PDF
                        </button>
                        <button
                          type="button"
                          className="user-btn secondary"
                          disabled={busyInvoice === t.tokenId}
                          onClick={() => onDownloadInvoice(t.tokenId)}
                        >
                          <Download size={15} /> Tải PDF
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {!tickets.length && (
            <div className="user-empty">
              <Ticket size={40} />
              <p>
                Ví này chưa sở hữu vé trên ledger. Mint từ trang sự kiện để bắt đầu.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
