import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Ticket,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getEvents } from "../../services/api.js";

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
      <section className="user-hero user-hero-home">
        <div className="user-hero-glow" aria-hidden />
        <div className="user-hero-copy">
          <p className="user-eyebrow">
            <Sparkles size={14} /> Vé NFT trên sổ cái riêng
          </p>
          <h1 className="user-brand-hero">TicketChain</h1>
          <p className="user-lead">
            Mua vé sự kiện minh bạch — sở hữu on-chain, trần giá resale 110%, royalty về ban tổ chức.
          </p>
          <div className="user-hero-cta">
            <a href="#events" className="user-btn">
              Xem sự kiện <ArrowRight size={16} />
            </a>
            <Link to="/marketplace" className="user-btn secondary">
              Chợ resale
            </Link>
          </div>
        </div>
      </section>

      <section className="user-section" id="events">
        <div className="user-section-head">
          <div>
            <h2>
              <CalendarDays size={22} /> Sự kiện đang mở
            </h2>
            <p>Chọn sự kiện, thêm giỏ hoặc mint ngay bằng MetaMask.</p>
          </div>
        </div>

        {loading && (
          <div className="user-empty">
            <Loader2 size={32} className="spin" />
            <p>Đang tải sự kiện…</p>
          </div>
        )}
        {error && (
          <div className="user-alert err">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="user-event-grid">
          {items.map((ev) => {
            const minPrice = Math.min(
              ...(ev.ticketTypes || []).map((t) => Number(t.price) || Infinity)
            );
            return (
              <Link key={ev._id} to={`/events/${ev._id}`} className="user-event-card user-event-card-link">
                <div className="user-event-card-top">
                  <h3>{ev.title}</h3>
                  {Number.isFinite(minPrice) && (
                    <span className="user-price-tag">từ {minPrice} ETH</span>
                  )}
                </div>
                <div className="user-meta">
                  <span className="user-meta-row">
                    <MapPin size={14} /> {ev.location}
                  </span>
                  <span className="user-meta-row">
                    <CalendarDays size={14} /> {new Date(ev.startTime).toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="user-event-desc">{ev.description}</p>
                <div className="user-chip-row">
                  {ev.ticketTypes?.slice(0, 3).map((t) => (
                    <span key={t.eventChainId} className="user-chip">
                      <Ticket size={12} /> {t.name}
                    </span>
                  ))}
                  {(ev.ticketTypes?.length || 0) > 3 && (
                    <span className="user-chip muted">+{ev.ticketTypes.length - 3}</span>
                  )}
                </div>
                <span className="user-btn user-btn-static">
                  Xem chi tiết <ArrowRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>

        {!loading && !items.length && !error && (
          <div className="user-empty">
            <CalendarDays size={40} />
            <p>Chưa có sự kiện. Chạy seed backend rồi tải lại trang.</p>
          </div>
        )}
      </section>
    </>
  );
}
