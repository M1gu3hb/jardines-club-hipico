import { useState, useEffect } from "react";
import QRCode from "qrcode";

/** Genera y muestra un QR (PNG data-url) a partir de un texto/URL. */
export default function QrImg({ text, size = 140, className = "" }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(text, { width: size, margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then((url) => { if (vivo) setSrc(url); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [text, size]);

  if (!src) return <div style={{ width: size, height: size }} className={`bg-white/5 ${className}`} />;
  return <img src={src} width={size} height={size} alt="QR de invitación" className={className} />;
}
