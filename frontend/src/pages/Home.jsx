import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Ticket, AlertCircle, Loader2 } from "lucide-react";
import { getEvents } from "../services/api.js";

export default function Home() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then((data) => setItems(data.items || []))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>TicketChain</h1>
          <p>Mua vé NFT sơ cấp trên mạng riêng tư — tối đa 2 vé mỗi ví mỗi loại.</p>
        </div>
      </div>

      <section className="user-section">
        <div className="user-section-head">
          <div>
            <h2>
              <CalendarDays size={22} /> Sự kiện đang mở
            </h2>
            <p>Chọn sự kiện và mint vé trực tiếp từ ví MetaMask.</p>
          </div>
        </div>

        {loading && (
          <div className="user-empty">
            <Loader2 size={32} className="spin" />
            <p>Đang tải…</p>
          </div>
        )}
        {error && (
          <div className="user-alert err">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="user-event-grid">
          {items.map((ev) => (
            <article key={ev._id} className="user-event-card">
              <h3>{ev.title}</h3>
              <div className="user-meta">
                <span className="user-meta-row">
                  <MapPin size={14} /> {ev.location}
                </span>
                <span className="user-meta-row">
                  <CalendarDays size={14} />{" "}
                  {new Date(ev.startTime).toLocaleString("vi-VN")}
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--u-muted)", fontSize: "0.92rem" }}>
                {ev.description}
              </p>
              <div className="user-chip-row">
                {ev.ticketTypes?.map((t) => (
                  <span key={t.eventChainId} className="user-chip">
                    <Ticket size={12} /> {t.name}: {t.price} ETH
                  </span>
                ))}
              </div>
              <Link className="user-btn" to={`/events/${ev._id}`}>
                Chi tiết / Mua vé
              </Link>
            </article>
          ))}
        </div>

        {!loading && !items.length && !error && (
          <div className="user-empty">
            <CalendarDays size={40} />
            <p>
              Chưa có sự kiện. Chạy seed backend: <code>node src/scripts/seed.js</code>
            </p>
          </div>
        )}
      </section>
    </>
  );
}
