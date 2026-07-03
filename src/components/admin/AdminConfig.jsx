import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Upload, Loader2 } from "lucide-react";

export default function AdminConfig() {
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingProx, setUploadingProx] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.ConfigSitio.list().then((d) => {
      if (d[0]) { setConfig(d[0]); setConfigId(d[0].id); }
      else setConfig({
        logoUrl: "", telefonoContacto: "", correoAdmin: "",
        ubicacionTexto: "", ubicacionLinkMapa: "",
        textoNoIncluye: "", textoServicios: "", textoAmenidades: "",
      });
    });
  }, []);

  const set = (field, val) => setConfig((c) => ({ ...c, [field]: val }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("logoUrl", file_url);
    setUploadingLogo(false);
  };

  const handleProxUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingProx(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("proximamenteImagenUrl", file_url);
    setUploadingProx(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (configId) {
      await base44.entities.ConfigSitio.update(configId, config);
    } else {
      const c = await base44.entities.ConfigSitio.create(config);
      setConfigId(c.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!config) return <div className="text-white/30 text-sm py-10 text-center">Cargando...</div>;

  return (
    <div>
      <h2 className="text-white text-2xl font-thin mb-1">Configuración del sitio</h2>
      <p className="text-white/30 text-sm mb-8">Edita los datos generales del sitio público.</p>

      <div className="space-y-8">
        {/* Logo */}
        <Section title="Logo">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {config.logoUrl ? (
              <div className="bg-white/5 p-4 rounded border border-white/10">
                <img src={config.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-white/5 border border-white/10 rounded flex items-center justify-center">
                <span className="text-white/20 text-xs">Sin logo</span>
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 border border-[#C9A84C]/30 text-[#C9A84C]/70 hover:text-[#C9A84C] hover:border-[#C9A84C]/60 px-5 py-2.5 text-sm transition-all">
              {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingLogo ? "Subiendo..." : "Subir logo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </Section>

        {/* Contacto */}
        <Section title="Contacto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Teléfono (visible en el sitio)" value={config.telefonoContacto} onChange={(v) => set("telefonoContacto", v)} placeholder="+52 55 0000 0000" />
            <Field label="Correo admin (recibe solicitudes)" value={config.correoAdmin} onChange={(v) => set("correoAdmin", v)} placeholder="admin@ejemplo.mx" />
            <Field label="Texto de ubicación" value={config.ubicacionTexto} onChange={(v) => set("ubicacionTexto", v)} placeholder="Ej: Av. Insurgentes Sur 1234, CDMX" />
            <Field label="Link Google Maps" value={config.ubicacionLinkMapa} onChange={(v) => set("ubicacionLinkMapa", v)} placeholder="https://maps.google.com/..." />
          </div>
        </Section>

        {/* WhatsApp */}
        <Section title="WhatsApp">
          <p className="text-white/25 text-xs mb-3">Número al que se enviarán los mensajes de cotización y el botón flotante. Solo dígitos, sin espacios ni guiones.</p>
          <div className="max-w-xs">
            <Field label="Número de WhatsApp" value={config.whatsappNumero} onChange={(v) => set("whatsappNumero", v)} placeholder="5523118153" />
          </div>
        </Section>

        {/* Próximamente (anuncio en Hero) */}
        <Section title="Anuncio Próximamente (Hero)">
          <p className="text-white/25 text-xs mb-4">Activa un cartel/anuncio visible dentro del Hero. Al hacer click abre la imagen completa en pantalla.</p>

          <label className="flex items-center gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.proximamenteActivo !== false}
              onChange={(e) => set("proximamenteActivo", e.target.checked)}
              className="w-4 h-4 accent-[#C9A84C]"
            />
            <span className="text-white/70 text-sm">Mostrar anuncio Próximamente en el Hero</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="Etiqueta del anuncio" value={config.proximamenteTextoBoton} onChange={(v) => set("proximamenteTextoBoton", v)} placeholder="Próximamente" />
            <Field label="Título del anuncio (opcional)" value={config.proximamenteTitulo} onChange={(v) => set("proximamenteTitulo", v)} placeholder="VW Style Club · 20 años" />
          </div>

          <div className="mb-4">
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Descripción corta (opcional)</label>
            <textarea
              value={config.proximamenteDescripcion || ""}
              onChange={(e) => set("proximamenteDescripcion", e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none"
              placeholder="Una breve descripción del próximo evento."
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start">
            {config.proximamenteImagenUrl ? (
              <div className="bg-white/5 p-2 rounded border border-white/10">
                <img src={config.proximamenteImagenUrl} alt="Próximamente" className="h-24 w-auto object-contain rounded" />
              </div>
            ) : (
              <div className="w-32 h-20 bg-white/5 border border-white/10 rounded flex items-center justify-center">
                <span className="text-white/20 text-xs">Sin imagen</span>
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 border border-[#C9A84C]/30 text-[#C9A84C]/70 hover:text-[#C9A84C] hover:border-[#C9A84C]/60 px-5 py-2.5 text-sm transition-all">
              {uploadingProx ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingProx ? "Subiendo..." : "Subir imagen del anuncio"}
              <input type="file" accept="image/*" className="hidden" onChange={handleProxUpload} />
            </label>
          </div>
        </Section>

        {/* Información de Servicios */}
        <Section title="Información de Servicios">
          <textarea
            value={config.informacionServicios || ""}
            onChange={(e) => set("informacionServicios", e.target.value)}
            rows={8}
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none"
            placeholder="Ej: El paquete base incluye mesas, sillas, mantelería y montaje básico.&#10;&#10;Servicios adicionales disponibles:&#10;- Alimentos y bebidas&#10;- DJ y pista de baile"
          />
        </Section>

        {/* Servicios */}
        <Section title="Servicios (uno por línea)">
          <textarea
            value={config.textoServicios || ""}
            onChange={(e) => set("textoServicios", e.target.value)}
            rows={6}
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none"
            placeholder="Atención personalizada&#10;Estacionamiento&#10;..."
          />
        </Section>

        {/* Amenidades */}
        <Section title="Amenidades (una por línea)">
          <textarea
            value={config.textoAmenidades || ""}
            onChange={(e) => set("textoAmenidades", e.target.value)}
            rows={6}
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none"
            placeholder="Jardines naturales&#10;Iluminación regulable&#10;..."
          />
        </Section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-8 py-3 text-sm font-medium tracking-wide hover:bg-[#d4b558] transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3 pb-2 border-b border-white/5">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">{label}</label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40"
      />
    </div>
  );
}