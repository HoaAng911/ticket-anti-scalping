import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  MapPin,
  CalendarDays,
  Ticket,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { getEvent, getRemaining } from "../services/api.js";
import { buyPrimaryTicket } from "../services/contract.js";
import { useWallet } from "../hooks/useWallet.js";

export default function EventDetail() {
  const { id } = useParams();
  const { account, connect, wrongNetwork, ensureNetwork } = useWallet();
  const [event, setEvent] = useState(null);
  const [remaining, setRemaining] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getEvent(id)
      .then(async (ev) => {
        setEvent(ev);
        const map = {};
        for (const t of ev.ticketTypes || []) {
          try {
            map[t.eventChainId] = await getRemaining(t.eventChainId);
          } catch {
            map[t.eventChainId] = "?";
          }
        }
        setRemaining(map);
      })
      .catch((e) => setMsg(e.response?.data?.error || e.message));
  }, [id]);

  async function onBuy(t) {
    setMsg(null);
    setBusy(true);
    try {
      if (!account) await connect();
      if (wrongNetwork) await ensureNetwork();
      const { hash } = await buyPrimaryTicket(t.eventChainId, t.price);
      setMsg(`Mint thành công. Tx: ${hash}`);
      setRemaining((r) => ({
        ...r,
        [t.eventChainId]:
          typeof r[t.eventChainId] === "number" ? r[t.eventChainId] - 1 : r[t.eventChainId],
      }));
    } catch (e) {
      setMsg(e.shortMessage || e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!event && !msg) {
    return (
      <div className="user-empty">
        <Loader2 size={32} />
        <p>Đang tải…</p>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="user-alert err">
        <AlertCircle size={16} /> {msg}
      </div>
    );
  }

  const msgOk = msg && msg.startsWith("Mint");

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>{event.title}</h1>
          <p>
            <MapPin size={14} style={{ verticalAlign: -2 }} /> {event.location}
            {" · "}
            <CalendarDays size={14} style={{ verticalAlign: -2 }} />{" "}
            {new Date(event.startTime).toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      <section className="user-section">
        <p style={{ color: "var(--u-muted)", fontSize: "1.05rem", maxWidth: "52ch" }}>
          {event.description}
        </p>
        {msg && (
          <div className={`user-alert ${msgOk ? "ok" : "err"}`}>
            {msgOk ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {msg}
          </div>
        )}
        <div className="user-event-grid">
          {event.ticketTypes.map((t) => (
            <div key={t.eventChainId} className="user-event-card">
              <div className="user-chip">
                <Ticket size={12} /> {t.name}
              </div>
              <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "1.5rem", margin: 0 }}>
                {t.price} ETH
              </h3>
              <p className="user-meta" style={{ margin: 0 }}>
                Còn {remaining[t.eventChainId] ?? "…"} / {t.totalSupply}
              </p>
              <p className="user-meta" style={{ margin: 0 }}>
                eventChainId = {t.eventChainId}
              </p>
              <button
                type="button"
                className="user-btn"
                disabled={busy}
                onClick={() => onBuy(t)}
              >
                <ShoppingCart size={16} />
                {busy ? "Đang mint…" : "Mua vé (mint)"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
