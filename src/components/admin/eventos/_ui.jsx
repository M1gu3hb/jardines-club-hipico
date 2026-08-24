/**
 * Helpers de UI de las pantallas de eventos del panel admin.
 *
 * DESDE LA FASE 1 DE LA SEPARACIÓN (`docs/PLAN-INDEPENDIZACION.md` §3, A1 y A2) los controles
 * genéricos ya NO se declaran aquí: viven en `@/components/ui/Comunes`, que es neutral y viaja a
 * las tres aplicaciones. Este archivo queda como re-export para que las cuatro pantallas
 * hermanas de `admin/eventos/` (`AdminEventos`, `EventoDatos`, `EventoFicha`, `EventoItems`)
 * sigan importando de `./_ui` sin cambiar una línea.
 *
 * El cambio es ADITIVO por exigencia de R4: no se borra nada del repo actual hasta que el CRM
 * esté desplegado y validado. Cuando la FASE 6 retire `components/admin/**`, este archivo se va
 * con él y no queda rastro.
 *
 * Lo que SÍ sigue naciendo aquí es `ESTATUS`, porque es del dominio de eventos y arrastra
 * `@/lib/catalogos`, que viaja al CRM. Subirlo a `ui/Comunes` obligaría al portal a llevarse ese
 * archivo para satisfacer un re-export que no usa.
 */
export { Field, Area, Toggle, estatusColor } from "@/components/ui/Comunes";

// Re-export del catálogo: la lista vive en `src/lib/catalogos.js`, que es espejo de
// `eventos_estatus_check`. Aquí NO se declara una segunda copia — es como se colaron los
// dos bugs de lista cerrada del proyecto.
export { EVENTO_ESTATUS as ESTATUS } from "@/lib/catalogos";
