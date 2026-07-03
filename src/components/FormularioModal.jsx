import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { playSound } from "./soundSystem";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

const TIPOS_EVENTO = ["Boda", "XV Años", "Cumpleaños", "Infantil", "Empresarial", "Otro"];

const initialForm = {
  salonSeleccionado: "",
  nombreCompleto: "",
  telefono: "",
  email: "",
  tipoEvento: "",
  tipoEventoOtro: "",
  fechaTentativa: "",
  numeroPersonas: "",
  comentarios: "",
  aceptoAvisoPrivacidad: false,
};

export default function FormularioModal({ open, onClose, preselectedSalon, whatsappNumero }) {
  // step 0 = elegir espacio (si no viene preseleccionado), step 1 = datos
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...initialForm });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [folioFinal, setFolioFinal] = useState("");
  const [error, setError] = useState("");
  const [salones, setSalones] = useState([]);

  const justSentRef = useRef(false);
  useLockBodyScroll(open || sent);

  const handleVolverInicio = () => {
    setSent(false);
    setFolioFinal("");
    setForm({ ...initialForm });
    setStep(0);
    justSentRef.current = false;
    onClose();
    setTimeout(() => {
      const inicio = document.getElementById("inicio");
      if (inicio) inicio.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    if (open && !justSentRef.current) {
      try { playSound("open"); } catch (e) {}
      setSent(false);
      setError("");
      setFolioFinal("");
      setLoading(false);
      if (preselectedSalon) {
        setForm({ ...initialForm, salonSeleccionado: preselectedSalon });
        setStep(1);
      } else {
        setForm({ ...initialForm });
        setStep(0);
      }
    }
    if (!open) justSentRef.current = false;
  }, [open, preselectedSalon]);

  useEffect(() => {
    base44.entities.Salon.list("orden").then(d => setSalones(d.filter(s => s.activo !== false))).catch(() => {});
  }, []);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const salonesDisponibles = salones.length > 0 ? salones.map(s => s.nombre) : [];
  const tipoEventoFinal = form.tipoEvento === "Otro" ? (form.tipoEventoOtro || "").trim() : form.tipoEvento;
  const waNumero = whatsappNumero || "525548663656";

  const puedeEnviar =
    !!form.nombreCompleto &&
    !!form.telefono &&
    !!form.tipoEvento &&
    (form.tipoEvento !== "Otro" || !!form.tipoEventoOtro) &&
    !!form.fechaTentativa &&
    !!form.numeroPersonas &&
    form.aceptoAvisoPrivacidad;

  const handleSubmit = async () => {
    if (!puedeEnviar) {
      if (!form.aceptoAvisoPrivacidad) setError("Debes aceptar el aviso de privacidad.");
      else setError("Completa los campos obligatorios (*).");
      return;
    }
    setLoading(true);
    setError("");

    let folioGenerado = `JCH-${Math.random().toString(36).slice(-6).toUpperCase()}`;

    try {
      const now = new Date();
      const horaEnvio = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const fechaEnvio = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

      const dataToSave = {
        salonSeleccionado: form.salonSeleccionado || "Por definir",
        nombreCompleto: form.nombreCompleto || "",
        telefono: form.telefono || "",
        email: form.email || "",
        tipoEvento: tipoEventoFinal || "",
        fechaTentativa: form.fechaTentativa || "",
        numeroPersonas: Number(form.numeroPersonas) || 0,
        comentarios: form.comentarios || "",
        aceptoAvisoPrivacidad: true,
        horaEnvio,
        fechaEnvio,
        estatus: "Nueva",
      };

      const creada = await base44.entities.SolicitudEvento.create(dataToSave);
      if (creada && creada.id) {
        folioGenerado = `JCH-${creada.id.slice(-6).toUpperCase()}`;
        base44.entities.SolicitudEvento.update(creada.id, { folio: folioGenerado }).catch(() => {});
      }

      // Enviar correo al administrador (función serverless → Gmail)
      base44.functions.invoke("gmailSolicitud", {
        data: {
          folio: folioGenerado,
          fechaEnvio,
          horaEnvio,
          nombreCompleto: form.nombreCompleto || "",
          telefono: form.telefono || "",
          email: form.email || "",
          salonSeleccionado: form.salonSeleccionado || "Por definir",
          tipoEvento: tipoEventoFinal || "",
          fechaTentativa: form.fechaTentativa || "",
          numeroPersonas: form.numeroPersonas || "",
          comentarios: form.comentarios || "",
        },
      }).catch(() => {});
    } catch (e) {
      console.error("[FormularioModal] Error al guardar solicitud:", e);
    }

    justSentRef.current = true;
    try { playSound("success"); } catch (e) {}
    setFolioFinal(folioGenerado);
    setLoading(false);
    setSent(true);
  };

  // --- PANTALLA DE CONFIRMACIÓN ---
  if (sent) {
    const folio = folioFinal || "—";
    const waLink = `https://wa.me/${waNumero}?text=${encodeURIComponent(`Hola, envié una solicitud de evento.\nFolio: ${folio}\nQuisiera recibir información sobre mi cotización.`)}`;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid rgba(201,168,76,0.3)", width: "100%", maxWidth: "480px", borderRadius: "4px", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid rgba(201,168,76,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p style={{ color: "#ffffff", fontSize: 20, fontWeight: 300, marginBottom: 8 }}>¡Solicitud enviada!</p>
          <p style={{ color: "rgba(201,168,76,0.8)", fontSize: 14, marginBottom: 6 }}>
            Folio: <strong>{folio}</strong>
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
            Nos comunicaremos contigo a la brevedad. Para una atención más rápida y personalizada, escríbenos por WhatsApp.
          </p>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#25D366", color: "#fff", padding: "14px 20px", fontSize: 15, textDecoration: "none", borderRadius: "2px", marginBottom: 12, fontWeight: 500 }}>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar por WhatsApp
          </a>
          <button onClick={handleVolverInicio}
            style={{ display: "block", width: "100%", padding: "12px 20px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", borderRadius: "2px" }}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#0a0a0a] border border-[#C9A84C]/20 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl shadow-black">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#C9A84C]/10 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-white font-light tracking-wide text-lg">Cotiza tu evento</h2>
            <p className="text-white/30 text-xs mt-0.5">Sin costo · Te respondemos en menos de 24h</p>
          </div>
          <button onClick={() => { try { playSound("close"); } catch (e) {} onClose(); }} className="text-white/30 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* STEP 0: elegir espacio (solo si no viene preseleccionado) */}
          {step === 0 && (
            <div>
              <p className="text-white/50 text-sm mb-5">¿Para qué espacio deseas cotizar?</p>
              <div className="space-y-2">
                {salonesDisponibles.map(s => (
                  <button key={s} type="button"
                    onClick={() => { set("salonSeleccionado", s); try { playSound("click"); } catch (e) {} setStep(1); }}
                    className="w-full flex items-center justify-between px-5 py-4 border border-white/10 hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 text-white/70 hover:text-white transition-all text-sm text-left rounded-xl">
                    <span>{s}</span>
                    <ChevronRight size={16} className="text-[#C9A84C]/50" />
                  </button>
                ))}
                <button type="button"
                  onClick={() => { set("salonSeleccionado", ""); try { playSound("click"); } catch (e) {} setStep(1); }}
                  className="w-full flex items-center justify-between px-5 py-4 border border-dashed border-[#C9A84C]/30 hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5 text-[#C9A84C]/80 transition-all text-sm text-left rounded-xl">
                  <span>Aún no lo decido — ayúdenme a elegir</span>
                  <ChevronRight size={16} className="text-[#C9A84C]/50" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: datos esenciales */}
          {step === 1 && (
            <div>
              {form.salonSeleccionado ? (
                <div className="mb-5 inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-3 py-1.5 text-[#C9A84C] text-xs tracking-wide rounded-md">
                  {form.salonSeleccionado}
                </div>
              ) : (
                <div className="mb-5 inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 text-white/50 text-xs tracking-wide rounded-md">
                  Espacio por definir
                </div>
              )}

              <div className="space-y-4">
                <Field label="Nombre completo *" value={form.nombreCompleto} onChange={v => set("nombreCompleto", v)} />
                <Field label="Teléfono / WhatsApp *" value={form.telefono} onChange={v => set("telefono", v)} type="tel" />

                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Tipo de evento *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIPOS_EVENTO.map(t => (
                      <button key={t} type="button" onClick={() => set("tipoEvento", t)}
                        className={`py-2.5 text-xs border transition-all rounded-lg ${form.tipoEvento === t ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]" : "border-white/10 text-white/40 hover:border-white/30"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {form.tipoEvento === "Otro" && (
                    <input value={form.tipoEventoOtro} onChange={e => set("tipoEventoOtro", e.target.value)}
                      placeholder="Ej: graduación, bautizo, aniversario..."
                      className="mt-3 w-full bg-white/5 border border-[#C9A84C]/30 text-white/80 text-sm px-4 py-3 rounded-xl outline-none focus:border-[#C9A84C]/60 placeholder:text-white/20" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha tentativa *" value={form.fechaTentativa} onChange={v => set("fechaTentativa", v)} type="date" />
                  <Field label="Nº de personas *" value={form.numeroPersonas} onChange={v => set("numeroPersonas", v)} type="number" />
                </div>

                <Field label="Correo (opcional)" value={form.email} onChange={v => set("email", v)} type="email" />

                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Comentarios (opcional)</label>
                  <textarea value={form.comentarios} onChange={e => set("comentarios", e.target.value)} rows={2}
                    className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-4 py-3 rounded-xl outline-none focus:border-[#C9A84C]/40 resize-none placeholder:text-white/20"
                    placeholder="Cuéntanos brevemente sobre tu evento." />
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <CheckBtn checked={form.aceptoAvisoPrivacidad} onChange={() => set("aceptoAvisoPrivacidad", !form.aceptoAvisoPrivacidad)} />
                  <span className="text-white/30 text-xs leading-relaxed">
                    Acepto el aviso de privacidad y autorizo el tratamiento de mis datos personales. *
                  </span>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

              <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/5">
                {!preselectedSalon ? (
                  <button type="button" onClick={() => { try { playSound("click"); } catch (e) {} setStep(0); }} className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
                    <ChevronLeft size={16} /> Atrás
                  </button>
                ) : <div />}
                <button type="button" onClick={handleSubmit} disabled={!puedeEnviar || loading}
                  className="flex items-center gap-2 bg-[#C9A84C] disabled:bg-white/10 disabled:text-white/20 text-[#0a0a0a] px-7 py-3 text-sm font-medium tracking-wide hover:bg-[#d4b558] rounded-full shadow-lg shadow-[#C9A84C]/20 transition-all disabled:cursor-not-allowed">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? "Enviando..." : "Enviar solicitud"}
                  {!loading && <ChevronRight size={14} />}
                </button>
              </div>
              <p className="text-white/25 text-[11px] text-center mt-4">
                Solo lo esencial. Los detalles (montaje, alimentos, servicios) los vemos juntos por WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/8 text-white/85 text-sm px-4 py-3.5 rounded-xl outline-none focus:border-[#C9A84C]/50 focus:bg-[#C9A84C]/5 placeholder:text-white/15 transition-all duration-200" />
    </div>
  );
}

function CheckBtn({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange}
      className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all ${checked ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/20"}`}>
      {checked && <Check size={9} className="text-black" />}
    </button>
  );
}
