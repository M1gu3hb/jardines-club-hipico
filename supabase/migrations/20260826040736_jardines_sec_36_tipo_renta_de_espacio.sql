-- ════════════════════════════════════════════════════════════════════════════════
-- sec_36 · Un tipo de evento más: la renta del espacio a secas
-- ════════════════════════════════════════════════════════════════════════════════
--
-- PARA QUÉ. Los catorce tipos publicados se leen como un catálogo cerrado, y no lo son. El
-- dueño lo dijo así: la lista son sugerencias, pero el recinto se ha usado para cosas que no
-- están en ninguna de las catorce. Quien busca algo que no ve en la lista concluye que aquí
-- no se hace, y se va.
--
-- Esta fila existe para recoger a esa gente. No describe un evento concreto a propósito.
--
-- ACTIVO = FALSE A PROPÓSITO, y no es que esté a medias. En este sitio `activo` decide si la
-- tarjeta lleva a una página propia o al formulario con el tipo ya puesto (ver
-- `src/pages/Eventos.jsx`). Aquí se quiere lo segundo: no hay una página que escribir sobre
-- «lo que se te ocurra», y el dato valioso es que nos cuente QUÉ tiene en mente.
--
-- ORDEN 15 para que quede la última, después de los catorce concretos: primero lo que la
-- gente reconoce, y al final la puerta abierta. De paso, quince tarjetas llenan cinco filas
-- de tres exactas y desaparece el hueco que el dueño señaló en `/eventos`.
--
-- SIN NADA INVENTADO. Ni capacidades, ni horarios, ni precios, ni tipos de evento concretos
-- que no consten. La descripción habla de lo que hay —terreno, salones, jardines— y pide que
-- el visitante ponga el resto.
--
-- ADITIVA. Un solo INSERT en `jardines.tipos_evento`. No toca esquema, políticas, permisos ni
-- nada del schema `public` (Vero Seguros queda intacto).
-- ════════════════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO jardines.tipos_evento (slug, nombre, descripcion_corta, activo, orden)
VALUES (
  'renta-de-espacio',
  'Renta del espacio',
  $$Hay eventos que no entran en ninguna lista, y para esos el recinto se renta por sí mismo: tú traes la idea y el formato, y aquí están el terreno, los salones y los jardines para sostenerla. Cuéntanos qué tienes en mente y te decimos qué espacio le queda mejor.$$,
  false,
  15
)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion_corta = EXCLUDED.descripcion_corta,
  orden = EXCLUDED.orden;

COMMIT;
