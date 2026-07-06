import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings, Image, Building2, LayoutGrid, Inbox, LogOut, Menu, X, Sparkles, ListChecks, Star, UtensilsCrossed, CalendarDays, Gauge } from "lucide-react";
import AdminInicio from "@/components/admin/AdminInicio";
import AdminEventos from "@/components/admin/eventos/AdminEventos";
import AdminConfig from "@/components/admin/AdminConfig";
import AdminSalones from "@/components/admin/AdminSalones";
import AdminGaleria from "@/components/admin/AdminGaleria";
import AdminSolicitudes from "@/components/admin/AdminSolicitudes";
import AdminServicios from "@/components/admin/AdminServicios";
import AdminServicioItems from "@/components/admin/AdminServicioItems";
import AdminAmenidadItems from "@/components/admin/AdminAmenidadItems";
import AdminAlimentos from "@/components/admin/AdminAlimentos";
import AdminResenas from "@/components/admin/AdminResenas";

const GRUPOS = [
  {
    titulo: "Operación",
    tabs: [
      { id: "resumen", label: "Resumen", icon: Gauge },
      { id: "eventos", label: "Eventos", icon: CalendarDays },
      { id: "solicitudes", label: "Solicitudes", icon: Inbox },
      { id: "resenas", label: "Reseñas", icon: Star },
    ],
  },
  {
    titulo: "Sitio web",
    tabs: [
      { id: "config", label: "Configuración", icon: Settings },
      { id: "salones", label: "Salones", icon: Building2 },
      { id: "servicios-items", label: "Servicios", icon: ListChecks },
      { id: "amenidades-items", label: "Amenidades", icon: Star },
      { id: "servicios", label: "Servicios Extra", icon: Sparkles },
      { id: "alimentos", label: "Alimentos", icon: UtensilsCrossed },
      { id: "galeria", label: "Galería", icon: Image },
    ],
  },
];

const TABS = GRUPOS.flatMap((g) => g.tabs);

export default function AdminDashboard({ onLogout }) {
  const [active, setActive] = useState("resumen");
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className={`${mobileMenu ? "flex" : "hidden"} md:flex flex-col w-56 bg-[#080808] border-r border-white/5 fixed inset-y-0 left-0 z-50 md:relative`}>
        <div className="px-5 py-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-light tracking-wider">Panel Admin</p>
            <p className="text-[#C9A84C]/50 text-xs mt-0.5">Jardines Club Hípico</p>
          </div>
          <button onClick={() => setMobileMenu(false)} className="md:hidden text-white/30"><X size={16} /></button>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo}>
              <p className="text-white/20 text-[10px] uppercase tracking-[0.2em] px-3 mb-1.5">{grupo.titulo}</p>
              <div className="space-y-0.5">
                {grupo.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActive(tab.id); setMobileMenu(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      active === tab.id ? "bg-[#C9A84C]/10 text-[#C9A84C]" : "text-white/35 hover:text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <tab.icon size={15} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5 space-y-1">
          <a href="/" target="_blank" className="w-full flex items-center gap-3 px-3 py-2.5 text-white/25 hover:text-white/50 text-xs transition-colors">
            <LayoutGrid size={14} />
            Ver sitio público
          </a>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-white/25 hover:text-red-400/60 text-xs transition-colors">
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-0 min-h-screen">
        {/* Mobile header */}
        <div className="md:hidden bg-[#080808] border-b border-white/5 px-5 py-3 flex items-center justify-between">
          <p className="text-white/60 text-sm">{TABS.find(t => t.id === active)?.label}</p>
          <button onClick={() => setMobileMenu(true)} className="text-white/40"><Menu size={20} /></button>
        </div>
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          {active === "resumen" && <AdminInicio onIr={setActive} />}
          {active === "eventos" && <AdminEventos />}
          {active === "config" && <AdminConfig />}
          {active === "salones" && <AdminSalones />}
          {active === "servicios-items" && <AdminServicioItems />}
          {active === "amenidades-items" && <AdminAmenidadItems />}
          {active === "servicios" && <AdminServicios />}
          {active === "alimentos" && <AdminAlimentos />}
          {active === "galeria" && <AdminGaleria />}
          {active === "resenas" && <AdminResenas />}
          {active === "solicitudes" && <AdminSolicitudes />}
        </div>
      </div>

      {mobileMenu && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileMenu(false)} />
      )}
    </div>
  );
}