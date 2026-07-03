import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check, Loader2, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { playSound } from "./soundSystem";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

const TIPOS_EVENTO = ["Boda", "XV Años", "Cumpleaños", "Empresarial", "Otro"];

const initialForm = {
  salonSeleccionado: "",
  nombreCompleto: "", telefono: "", email: "", direccion: "", rfc: "",
  requiereFactura: false,
  tipoEvento: "", tipoEventoOtro: "",
  fechaTentativa: "", horarioInicio: "", horarioFin: "",
  numeroPersonas: "",
  montaje: "",
  alimentosSeleccionados: [],
  actividadesExtras: [],
  amenidadesSeleccionadas: [],
  comentarios: "",
  aceptoAvisoPrivacidad: false,
};

export default function FormularioModal({ open, onClose, preselectedSalon, correoAdmin, whatsappNumero }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...initialForm });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [folioFinal, setFolioFinal] = useState("");
  const [error, setError] = useState("");
  const [serviciosExtra, setServiciosExtra] = useState([]);
  const [amenidadesExtra, setAmenidadesExtra] = useState([]);
  const [alimentos, setAlimentos] = useState([]);
  const [salones, setSalones] = useState([]);

  // Ref para evitar que el useEffect resetee sent cuando se acaba de enviar
  const justSentRef = useRef(false);

  // Bloquear scroll del fondo mientras el modal o la confirmación estén abiertos
  useLockBodyScroll(open || sent);

  // Cierra el modal/confirmación y lleva al usuario al inicio de la página
  const handleVolverInicio = () => {
    setSent(false);
    setFolioFinal("");
    setForm({ ...initialForm });
    setStep(0);
    justSentRef.current = false;
    onClose();
    // pequeño delay para que el scroll del body ya esté restaurado por el hook
    setTimeout(() => {
      const inicio = document.getElementById("inicio");
      if (inicio) inicio.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    if (open && !justSentRef.current) {
      try { playSound("open"); } catch(e) {}
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
    if (!open) {
      justSentRef.current = false;
    }
  }, [open, preselectedSalon]);

  useEffect(() => {
    base44.entities.ServicioExtra.list("orden").then(d => setServiciosExtra(d.filter(s => s.activo !== false))).catch(() => {});
    base44.entities.AmenidadItem.list("orden").then(d => setAmenidadesExtra(d.filter(a => a.activo !== false))).catch(() => {});
    base44.entities.AlimentoMenu.list("orden").then(d => setAlimentos(d.filter(a => a.activo !== false))).catch(() => {});
    base44.entities.Salon.list().then(d => setSalones(d.filter(s => s.activo !== false))).catch(() => {});
  }, []);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const toggleList = (field, val) =>
    set(field, form[field].includes(val) ? form[field].filter(a => a !== val) : [...form[field], val]);

  const salonesDisponibles = salones.length > 0
    ? salones.map(s => s.nombre)
    : ["Salón Cerrado", "Salón Encanto", "Kiosco", "Jardines", "Pony (Juegos)"];

  const serviciosFiltrados = serviciosExtra.filter(
    s => !s.aplicaA || s.aplicaA === "todos" || s.aplicaA === form.salonSeleccionado
  );
  const serviciosPorCategoria = serviciosFiltrados.reduce((acc, s) => {
    const cat = s.categoria || "Otros";
    acc[cat] = acc[cat] || [];
    acc[cat].push(s);
    return acc;
  }, {});

  const tipoEventoFinal = form.tipoEvento === "Otro" ? (form.tipoEventoOtro || "").trim() : form.tipoEvento;
  const waNumero = whatsappNumero || "525548663656";

  const handleSubmit = async () => {
    if (!form.aceptoAvisoPrivacidad) { setError("Debes aceptar el aviso de privacidad."); return; }
    setLoading(true);
    setError("");

    let folioGenerado = `JCH-${Math.random().toString(36).slice(-6).toUpperCase()}`;

    try {
      const now = new Date();
      const horaEnvio = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      const fechaEnvio = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

      const actividadesCompletas = [
        ...(form.actividadesExtras || []),
        ...(form.amenidadesSeleccionadas || []),
        ...(form.alimentosSeleccionados || []),
      ];

      const dataToSave = {
        salonSeleccionado: form.salonSeleccionado || "",
        nombreCompleto: form.nombreCompleto || "",
        telefono: form.telefono || "",
        email: form.email || "",
        direccion: form.direccion || "",
        rfc: form.requiereFactura ? (form.rfc || "") : "",
        tipoEvento: tipoEventoFinal || "",
        fechaTentativa: form.fechaTentativa || "",
        horarioInicio: form.horarioInicio || "",
        horarioFin: form.horarioFin || "",
        numeroPersonas: Number(form.numeroPersonas) || 0,
        manteleriaPreferida: form.montaje || "",
        actividadesExtras: actividadesCompletas,
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

      // Enviar correo al administrador via backend (Gmail connector)
      base44.functions.invoke("gmailSolicitud", {
        data: {
          folio: folioGenerado,
          fechaEnvio,
          horaEnvio,
          nombreCompleto: form.nombreCompleto || "",
          telefono: form.telefono || "",
          email: form.email || "",
          direccion: form.direccion || "",
          rfc: form.requiereFactura ? (form.rfc || "") : "",
          salonSeleccionado: form.salonSeleccionado || "",
          tipoEvento: tipoEventoFinal || "",
          fechaTentativa: form.fechaTentativa || "",
          horarioInicio: form.horarioInicio || "",
          horarioFin: form.horarioFin || "",
          numeroPersonas: form.numeroPersonas || "",
          manteleriaPreferida: form.montaje || "",
          actividadesExtras: actividadesCompletas,
          comentarios: form.comentarios || "",
        }
      }).catch(() => {});

    } catch (e) {
      console.error("[FormularioModal] Error al guardar solicitud:", e);
      // Aunque falle el guardado, mostramos confirmación
    }

    // Marcar que el envío fue exitoso ANTES de cambiar estado
    justSentRef.current = true;
    try { playSound("success"); } catch(e) {}

    // Guardar folio y mostrar confirmación
    setFolioFinal(folioGenerado);
    setLoading(false);
    setSent(true);
  };

  // --- PANTALLA DE CONFIRMACIÓN (independiente del estado open) ---
  if (sent) {
    const folio = folioFinal || "—";
    const waNum = whatsappNumero || "5523118153";
    const waLink = `https://wa.me/${waNum}?text=${encodeURIComponent(`Hola, envié una solicitud de evento.\nFolio: ${folio}\nQuisiera recibir información sobre mi cotización.`)}`;
    return (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      >
        <div
          style={{ backgroundColor: "#0f0f0f", border: "1px solid rgba(201,168,76,0.3)", width: "100%", maxWidth: "480px", borderRadius: "4px", padding: "32px 24px", textAlign: "center" }}
        >
          {/* Icono check */}
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
            Nos comunicaremos contigo a la brevedad.
          </p>

          {/* Botón WhatsApp */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#25D366", color: "#fff", padding: "14px 20px", fontSize: 15, textDecoration: "none", borderRadius: "2px", marginBottom: 12, fontWeight: 500 }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar por WhatsApp
          </a>

          {/* Botón cerrar / volver */}
          <button
            onClick={handleVolverInicio}
            style={{ display: "block", width: "100%", padding: "12px 20px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", borderRadius: "2px" }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // --- MODAL PRINCIPAL (solo si no está enviado) ---
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#0a0a0a] border border-[#C9A84C]/20 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl shadow-black">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#C9A84C]/10 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-white font-light tracking-wide text-lg">Cotización de evento</h2>
            <p className="text-white/30 text-xs mt-0.5">Sin costo · Te respondemos en menos de 24h</p>
          </div>
          <button onClick={() => { try { playSound("close"); } catch(e) {} onClose(); }} className="text-white/30 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* STEP 0: Selección de salón */}
          {step === 0 && (
            <div>
              <p className="text-white/50 text-sm mb-6">¿Para qué espacio deseas cotizar?</p>
              <div className="space-y-2">
                {salonesDisponibles.map(s => (
                  <button key={s}
                    onClick={() => { set("salonSeleccionado", s); setStep(1); }}
                    className="w-full flex items-center justify-between px-5 py-4 border border-white/10 hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 text-white/70 hover:text-white transition-all text-sm text-left rounded-xl">
                    <span>{s}</span>
                    <ChevronRight size={16} className="text-[#C9A84C]/50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: Datos del cliente */}
          {step === 1 && (
            <div>
              {form.salonSeleccionado && (
                <div className="mb-5 inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-3 py-1.5 text-[#C9A84C] text-xs tracking-wide">
                  {form.salonSeleccionado}
                </div>
              )}
              <p className="text-white/40 text-xs mb-5 uppercase tracking-widest">Datos del cliente</p>
              <div className="space-y-4">
                <Field label="Nombre completo *" value={form.nombreCompleto} onChange={v => set("nombreCompleto", v)} />
                <Field label="Teléfono *" value={form.telefono} onChange={v => set("telefono", v)} type="tel" />
                <Field label="Correo electrónico *" value={form.email} onChange={v => set("email", v)} type="email" />
                <Field label="Dirección" value={form.direccion} onChange={v => set("direccion", v)} />
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <CheckBtn checked={form.requiereFactura} onChange={() => set("requiereFactura", !form.requiereFactura)} />
                    <span className="text-white/40 text-xs">Requiero factura</span>
                  </div>
                  {form.requiereFactura && <Field label="RFC *" value={form.rfc} onChange={v => set("rfc", v)} />}
                </div>
              </div>
              <NavButtons onNext={() => setStep(2)} canNext={!!(form.nombreCompleto && form.telefono && form.email)} showBack={!preselectedSalon} onBack={() => setStep(0)} />
            </div>
          )}

          {/* STEP 2: Datos del evento */}
          {step === 2 && (
            <div>
              <p className="text-white/40 text-xs mb-5 uppercase tracking-widest">Datos del evento</p>
              <div className="space-y-4">
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Tipo de evento *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIPOS_EVENTO.map(t => (
                      <button key={t} onClick={() => set("tipoEvento", t)}
                        className={`py-2.5 text-xs border transition-all rounded-lg ${form.tipoEvento === t ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]" : "border-white/10 text-white/40 hover:border-white/30"}` }>
                        {t}
                      </button>
                    ))}
                  </div>
                  {form.tipoEvento === "Otro" && (
                    <input
                      value={form.tipoEventoOtro}
                      onChange={e => set("tipoEventoOtro", e.target.value)}
                      placeholder="Ej: Graduación, bautizo, aniversario..."
                      className="mt-3 w-full bg-white/5 border border-[#C9A84C]/30 text-white/80 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/60 placeholder:text-white/20"
                    />
                  )}
                </div>
                <Field label="Fecha tentativa *" value={form.fechaTentativa} onChange={v => set("fechaTentativa", v)} type="date" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Hora inicio" value={form.horarioInicio} onChange={v => set("horarioInicio", v)} type="time" />
                  <Field label="Hora fin" value={form.horarioFin} onChange={v => set("horarioFin", v)} type="time" />
                </div>
                <Field label="Número de personas *" value={form.numeroPersonas} onChange={v => set("numeroPersonas", v)} type="number" />
              </div>
              <NavButtons onNext={() => setStep(3)} canNext={!!(form.tipoEvento && form.fechaTentativa && form.numeroPersonas && (form.tipoEvento !== "Otro" || form.tipoEventoOtro))} showBack onBack={() => setStep(1)} />
            </div>
          )}

          {/* STEP 3: Montaje y alimentos */}
          {step === 3 && (
            <div>
              <p className="text-white/40 text-xs mb-5 uppercase tracking-widest">Montaje y alimentos</p>
              <div className="space-y-6">
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Montaje del evento</label>
                  <textarea
                    value={form.montaje}
                    onChange={e => set("montaje", e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-4 py-3.5 rounded-xl outline-none focus:border-[#C9A84C]/40 resize-none placeholder:text-white/20 transition-all duration-200"
                    placeholder="Ej: mesas redondas, mantelería dorada, decoración elegante..."
                  />
                </div>
                {alimentos.length > 0 && (
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Alimentos</label>
                    <div className="space-y-2">
                      {alimentos.map(al => (
                        <div key={al.id} className="flex flex-wrap items-center gap-3 py-3 border-b border-white/5">
                          <CheckBtn checked={form.alimentosSeleccionados.includes(al.nombre)} onChange={() => toggleList("alimentosSeleccionados", al.nombre)} />
                          <span className="text-white/65 text-sm flex-1 min-w-0">{al.nombre}</span>
                          {al.pdfUrl && (
                            <a href={al.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#C9A84C]/50 hover:text-[#C9A84C] text-xs transition-colors flex-shrink-0">
                              <FileText size={12} /> Ver menú
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <NavButtons onNext={() => setStep(4)} canNext showBack onBack={() => setStep(2)} />
            </div>
          )}

          {/* STEP 4: Servicios y amenidades */}
          {step === 4 && (
            <div>
              <p className="text-white/40 text-xs mb-5 uppercase tracking-widest">Servicios y amenidades</p>
              <div className="space-y-6">
                {Object.keys(serviciosPorCategoria).length > 0 && (
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Servicios extra</label>
                    <div className="space-y-4">
                      {Object.entries(serviciosPorCategoria).map(([cat, items]) => (
                        <div key={cat}>
                          <p className="text-white/20 text-xs uppercase tracking-widest mb-2">{cat}</p>
                          <div className="flex flex-col gap-2">
                            {items.map(s => (
                              <button key={s.id || s.nombre} onClick={() => toggleList("actividadesExtras", s.nombre)}
                                className={`flex items-center gap-3 px-4 py-3 text-sm border transition-all text-left w-full ${form.actividadesExtras.includes(s.nombre) ? "border-[#C9A84C]/60 bg-[#C9A84C]/5 text-[#C9A84C]/80" : "border-white/10 text-white/50 hover:border-white/20"}`}>
                                <CheckBtn small checked={form.actividadesExtras.includes(s.nombre)} onChange={() => {}} />
                                <span className="flex-1">{s.nombre}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {amenidadesExtra.length > 0 && (
                  <div>
                    <label className="text-white/40 text-xs uppercase tracking-wider mb-3 block">Amenidades</label>
                    <div className="flex flex-col gap-2">
                      {amenidadesExtra.map(a => (
                        <button key={a.id || a.titulo} onClick={() => toggleList("amenidadesSeleccionadas", a.titulo)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm border transition-all text-left w-full ${form.amenidadesSeleccionadas.includes(a.titulo) ? "border-[#C9A84C]/60 bg-[#C9A84C]/5 text-[#C9A84C]/80" : "border-white/10 text-white/50 hover:border-white/20"}`}>
                          <CheckBtn small checked={form.amenidadesSeleccionadas.includes(a.titulo)} onChange={() => {}} />
                          <span className="flex-1">{a.titulo}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(serviciosPorCategoria).length === 0 && amenidadesExtra.length === 0 && (
                  <p className="text-white/20 text-xs italic">Sin servicios ni amenidades configurados aún.</p>
                )}
              </div>
              <NavButtons onNext={() => setStep(5)} canNext showBack onBack={() => setStep(3)} />
            </div>
          )}

          {/* STEP 5: Comentarios finales */}
          {step === 5 && (
            <div>
              <p className="text-white/40 text-xs mb-5 uppercase tracking-widest">Comentarios finales</p>
              <div className="space-y-5">
                <div>
                  <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Comentarios adicionales</label>
                  <textarea
                    value={form.comentarios}
                    onChange={e => set("comentarios", e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-4 py-3.5 rounded-xl outline-none focus:border-[#C9A84C]/40 resize-none placeholder:text-white/20 transition-all duration-200"
                    placeholder="Cuéntanos cualquier detalle adicional sobre tu evento."
                  />
                </div>
                <div className="flex items-start gap-3 pt-2">
                  <CheckBtn checked={form.aceptoAvisoPrivacidad} onChange={() => set("aceptoAvisoPrivacidad", !form.aceptoAvisoPrivacidad)} />
                  <span className="text-white/30 text-xs leading-relaxed">
                    Acepto el aviso de privacidad y autorizo el tratamiento de mis datos personales. *
                  </span>
                </div>
              </div>
              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              <NavButtons
                onNext={handleSubmit}
                canNext={form.aceptoAvisoPrivacidad && !loading}
                nextLabel={loading ? "Enviando..." : "Enviar solicitud"}
                loading={loading}
                showBack onBack={() => setStep(4)}
              />
            </div>
          )}

          {/* Progress dots */}
          {step > 0 && (
            <div className="mt-6 flex gap-1.5 justify-center">
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className={`h-0.5 w-6 transition-all ${step >= s ? "bg-[#C9A84C]" : "bg-white/10"}`} />
              ))}
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

function CheckBtn({ checked, onChange, small = false }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`${small ? "w-3 h-3" : "w-4 h-4"} rounded-sm border flex-shrink-0 flex items-center justify-center transition-all ${checked ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/20"}`}
    >
      {checked && <Check size={small ? 7 : 9} className="text-black" />}
    </button>
  );
}

function NavButtons({ onNext, canNext, nextLabel = "Siguiente", onBack, showBack, loading }) {
  return (
    <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/5">
      {showBack ? (
        <button type="button" onClick={() => { try { playSound("click"); } catch(e) {} onBack(); }} className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
          <ChevronLeft size={16} /> Atrás
        </button>
      ) : <div />}
      <button
        type="button"
        onClick={() => { if (canNext && !loading) { try { playSound("click"); } catch(e) {} onNext(); } }}
        disabled={!canNext || loading}
        className="flex items-center gap-2 bg-[#C9A84C] disabled:bg-white/10 disabled:text-white/20 text-[#0a0a0a] px-7 py-3 text-sm font-medium tracking-wide hover:bg-[#d4b558] rounded-full shadow-lg shadow-[#C9A84C]/20 hover:shadow-[#C9A84C]/30 transition-all disabled:cursor-not-allowed"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {nextLabel}
        {!loading && <ChevronRight size={14} />}
      </button>
    </div>
  );
}