import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/api/authContext";
import { UserPlus, Loader2, Check, ShieldCheck, Phone, Mail, Eye, EyeOff } from "lucide-react";
import { Field } from "@/components/admin/eventos/_ui";

const VACIO = { nombre: "", correo: "", telefono: "", password: "" };

/**
 * Administradores del panel. Cualquier admin puede crear otro: todos pueden
 * hacer todo — el sistema solo distingue QUIÉN hizo cada cosa (creado_por).
 */
export default function AdminAdministradores() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [verPass, setVerPass] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, texto }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cargar = () => base44.entities.Perfil.filter({ rol: "admin" }).then(setAdmins);
  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    setMsg(null);
    if (!form.nombre.trim() || !form.correo.trim() || form.password.length < 8) {
      setMsg({ ok: false, texto: "Nombre, correo y contraseña (mín. 8 caracteres) son obligatorios." });
      return;
    }
    setGuardando(true);
    try {
      const r = await base44.functions.crearAdmin({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        telefono: form.telefono.trim() || null,
        password: form.password,
      });
      setMsg({
        ok: true,
        texto: `Administrador creado.${r.correoEnviado ? " Le llegó su correo de bienvenida con sus accesos. ✉️" : " (No se pudo enviar el correo; pásale sus accesos tú.)"}`,
      });
      setForm(VACIO);
      setCreando(false);
      cargar();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-thin">Administradores</h2>
          <p className="text-white/30 text-sm mt-1">Tu equipo con acceso al panel. Todos pueden hacer todo.</p>
        </div>
        <button onClick={() => { setForm(VACIO); setMsg(null); setCreando(true); }}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all">
          <UserPlus size={14} /> Nuevo admin
        </button>
      </div>

      {msg && (
        <p className={`text-xs mb-4 ${msg.ok ? "text-green-400/80" : "text-red-400"}`}>{msg.texto}</p>
      )}

      {creando && (
        <div className="bg-[#111] border border-[#C9A84C]/20 p-6 mb-6 space-y-4">
          <Field label="Nombre *" value={form.nombre} onChange={(v) => set("nombre", v)} placeholder="Nombre y apellido" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Correo * (con este entra)" value={form.correo} onChange={(v) => set("correo", v)} type="email" />
            <Field label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} />
          </div>
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Contraseña * (mín. 8)</label>
            <div className="relative">
              <input type={verPass ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 pr-10 outline-none focus:border-[#C9A84C]/40" />
              <button type="button" onClick={() => setVerPass(!verPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <p className="text-white/25 text-xs">Le llegará un correo dorado con sus accesos y el link del panel. Entra por la misma URL secreta que tú.</p>
          <div className="flex gap-3">
            <button onClick={crear} disabled={guardando}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-6 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Crear administrador
            </button>
            <button onClick={() => setCreando(false)} className="px-6 py-2.5 border border-white/10 text-white/40 hover:text-white/60 text-sm transition-all">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.id} className="skeu-card flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={17} className="text-[#C9A84C]/80" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/85 text-sm font-medium truncate">
                {a.nombre || "Administrador"}
                {a.userId === user?.id && <span className="text-[#C9A84C]/60 text-xs ml-2">(tú)</span>}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-white/35 text-xs">
                {a.correo && <span className="flex items-center gap-1 truncate"><Mail size={11} />{a.correo}</span>}
                {a.telefono && <span className="flex items-center gap-1"><Phone size={11} />{a.telefono}</span>}
              </div>
            </div>
          </div>
        ))}
        {admins.length === 0 && <p className="text-white/20 text-sm py-6 text-center">Cargando equipo…</p>}
      </div>
    </div>
  );
}
