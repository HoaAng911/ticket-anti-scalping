import { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ticket,
  ShieldCheck,
  Camera,
  CameraOff,
  ImageUp,
  SwitchCamera,
} from "lucide-react";
import jsQR from "jsqr";
import { verifyTicketEntry, checkInTicketEntry } from "../../services/api.js";
import { useWallet } from "../../hooks/useWallet.js";

function parseQrText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("QR trống");
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("QR không phải JSON vé hợp lệ");
  }
}

function decodeQrFromImageData(imageData) {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return code?.data || null;
}

async function decodeQrFromFile(file) {
  if (!file || !file.type?.startsWith("image/")) {
    throw new Error("Chọn ảnh vé (PNG/JPG/WebP) chứa mã QR.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scales = [1, 0.75, 0.5, 0.35];
    for (const scale of scales) {
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      if (w < 80 || h < 80) continue;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const text = decodeQrFromImageData(ctx.getImageData(0, 0, w, h));
      if (text) return text;
    }
    throw new Error("Không tìm thấy mã QR trong ảnh — chụp rõ hơn hoặc thử ảnh khác.");
  } finally {
    bitmap.close?.();
  }
}

export default function CheckIn() {
  const { account, connect } = useWallet();
  const [raw, setRaw] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [previewUrl, setPreviewUrl] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lastScanRef = useRef("");
  const scanningLockRef = useRef(false);
  const fileRef = useRef(null);

  function payloadFromForm() {
    const trimmed = raw.trim();
    if (trimmed) {
      try {
        return { qr: JSON.parse(trimmed) };
      } catch {
        throw new Error("Nội dung QR phải là JSON hợp lệ (quét từ vé vào cửa).");
      }
    }
    const tid = Number(tokenId);
    if (!Number.isFinite(tid) || tid <= 0) {
      throw new Error("Quét QR, tải ảnh vé, hoặc nhập Token NFT.");
    }
    return { tokenId: tid };
  }

  async function applyQrText(text, sourceLabel) {
    const payload = parseQrText(text);
    const pretty = JSON.stringify(payload, null, 2);
    setRaw(pretty);
    if (payload.tokenId != null) setTokenId(String(payload.tokenId));
    setScanHint(`${sourceLabel}: token #${payload.tokenId ?? "?"}`);
    setErr("");
    setResult(null);

    setBusy(true);
    try {
      const data = await verifyTicketEntry({ qr: payload });
      setResult({ mode: "verify", ...data });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  function stopCamera() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function tickScan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w && h) {
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const text = decodeQrFromImageData(ctx.getImageData(0, 0, w, h));
        if (text && text !== lastScanRef.current && !scanningLockRef.current) {
          lastScanRef.current = text;
          scanningLockRef.current = true;
          applyQrText(text, "Camera")
            .catch(() => {})
            .finally(() => {
              setTimeout(() => {
                scanningLockRef.current = false;
              }, 1800);
            });
        }
      }
    }
    rafRef.current = requestAnimationFrame(tickScan);
  }

  async function startCamera(nextFacing = facingMode) {
    setErr("");
    setScanHint("");
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Trình duyệt không hỗ trợ camera. Hãy tải ảnh vé lên.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setFacingMode(nextFacing);
      setCameraOn(true);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      lastScanRef.current = "";
      rafRef.current = requestAnimationFrame(tickScan);
    } catch (e) {
      setCameraOn(false);
      setErr(
        e.name === "NotAllowedError"
          ? "Chưa cấp quyền camera — cho phép truy cập rồi thử lại, hoặc tải ảnh vé."
          : e.message || "Không mở được camera"
      );
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onVerify() {
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const body = payloadFromForm();
      const data = await verifyTicketEntry(body);
      setResult({ mode: "verify", ...data });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCheckIn(force = false) {
    setBusy(true);
    setErr("");
    try {
      if (!account) await connect();
      const body = {
        ...payloadFromForm(),
        staffWallet: account || "",
        force,
      };
      const data = await checkInTicketEntry(body);
      setResult({ mode: "checkin", ...data });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
      if (e.response?.data?.data?.ticket) {
        setResult({
          mode: "checkin",
          valid: false,
          alreadyCheckedIn: true,
          ticket: e.response.data.data.ticket,
          message: e.response.data.error,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setBusy(true);
    try {
      const text = await decodeQrFromFile(file);
      await applyQrText(text, "Ảnh vé");
    } catch (ex) {
      setErr(ex.message || "Không đọc được QR từ ảnh");
      setBusy(false);
    }
  }

  const ticket = result?.ticket;

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>
            <ScanLine size={28} style={{ verticalAlign: -4 }} /> Kiểm soát vé
          </h1>
          <p>
            Quét QR bằng camera hoặc tải ảnh vé vào cửa để xác thực trước khi cho khách vào sự kiện.
          </p>
        </div>
      </div>

      <section className="user-section">
        <div className="checkin-layout">
          <div className="checkin-panel">
            <h2>
              <ShieldCheck size={18} /> Quét / tải vé
            </h2>

            <div className="checkin-scan-actions">
              {cameraOn ? (
                <button type="button" className="user-btn ghost" disabled={busy} onClick={stopCamera}>
                  <CameraOff size={16} /> Tắt camera
                </button>
              ) : (
                <button
                  type="button"
                  className="user-btn"
                  disabled={busy}
                  onClick={() => startCamera(facingMode)}
                >
                  <Camera size={16} /> Bật camera quét QR
                </button>
              )}
              <button
                type="button"
                className="user-btn secondary"
                disabled={busy || !cameraOn}
                onClick={() => startCamera(facingMode === "environment" ? "user" : "environment")}
              >
                <SwitchCamera size={16} /> Đổi camera
              </button>
              <button
                type="button"
                className="user-btn secondary"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <ImageUp size={16} /> Tải ảnh vé
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onPickImage}
              />
            </div>

            <div className={`checkin-viewport ${cameraOn ? "live" : ""}`}>
              <video
                ref={videoRef}
                className="checkin-video"
                playsInline
                muted
                autoPlay
                style={{ display: cameraOn ? "block" : "none" }}
              />
              <canvas ref={canvasRef} className="checkin-scan-canvas" aria-hidden />
              {!cameraOn && previewUrl ? (
                <img src={previewUrl} alt="Ảnh vé đã tải" className="checkin-preview" />
              ) : null}
              {!cameraOn && !previewUrl ? (
                <p className="checkin-viewport-hint">
                  Bật camera để quét QR trên vé, hoặc tải ảnh chụp vé / PDF screenshot.
                </p>
              ) : null}
              {cameraOn ? <div className="checkin-frame" aria-hidden /> : null}
            </div>

            {scanHint ? <p className="checkin-scan-hint">{scanHint}</p> : null}

            <details className="checkin-advanced">
              <summary>Nhập thủ công (dự phòng)</summary>
              <label className="checkin-label">
                JSON từ mã QR
                <textarea
                  rows={4}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder='{"v":1,"tokenId":12,"eventChainId":1,...}'
                  disabled={busy}
                />
              </label>
              <label className="checkin-label">
                Hoặc Token NFT #
                <input
                  type="number"
                  min={1}
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="vd: 12"
                  disabled={busy}
                />
              </label>
            </details>

            <div className="user-btn-row">
              <button type="button" className="user-btn secondary" disabled={busy} onClick={onVerify}>
                {busy ? <Loader2 size={16} className="spin" /> : <Ticket size={16} />}
                Chỉ kiểm tra
              </button>
              <button
                type="button"
                className="user-btn"
                disabled={busy}
                onClick={() => onCheckIn(false)}
              >
                <CheckCircle2 size={16} /> Check-in vào cửa
              </button>
            </div>
            {result?.alreadyCheckedIn ? (
              <button
                type="button"
                className="user-btn ghost"
                style={{ marginTop: 10 }}
                disabled={busy}
                onClick={() => onCheckIn(true)}
              >
                Buộc check-in lại (force)
              </button>
            ) : null}
          </div>

          <div className="checkin-panel">
            <h2>Kết quả</h2>
            {err ? (
              <div className="user-alert err">
                <AlertCircle size={16} /> {err}
              </div>
            ) : null}
            {!result && !err ? (
              <p className="user-meta">Chưa có kết quả — quét QR hoặc tải ảnh vé rồi kiểm tra.</p>
            ) : null}
            {result ? (
              <div
                className={`checkin-result ${
                  result.valid || result.mode === "checkin" ? "ok" : ""
                } ${result.alreadyCheckedIn ? "warn" : ""}`}
              >
                <p className="checkin-result-msg">
                  {result.message || (result.valid ? "Vé hợp lệ" : "—")}
                </p>
                {ticket ? (
                  <dl className="pass-facts">
                    <div>
                      <dt>Token</dt>
                      <dd>#{ticket.tokenId}</dd>
                    </div>
                    <div>
                      <dt>Sự kiện</dt>
                      <dd>{ticket.event?.title || `eventChainId ${ticket.eventChainId}`}</dd>
                    </div>
                    <div>
                      <dt>Hạng / ghế</dt>
                      <dd>
                        {ticket.tierName || "—"}
                        {ticket.seatLabel || ticket.seatId
                          ? ` · ${ticket.seatLabel || ticket.seatId}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Chủ ví</dt>
                      <dd className="mono">{ticket.ownerWallet}</dd>
                    </div>
                    <div>
                      <dt>Check-in</dt>
                      <dd>
                        {ticket.checkedInAt
                          ? new Date(ticket.checkedInAt).toLocaleString("vi-VN")
                          : "Chưa"}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
