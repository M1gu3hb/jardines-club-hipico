-- ════════════════════════════════════════════════════════════════════════════════
-- sec_35a · Arregla los seis tipos de evento que ya existian
-- ════════════════════════════════════════════════════════════════════════════════
--
-- PARA QUÉ. `/eventos` enseñaba seis tipos y uno de ellos (`cumpleanos`) estaba vacío y
-- apagado. El dueño lo dijo claro: «Jardines Club Hípico es para todo tipo de eventos».
-- Con seis, quien busca un bautizo o una graduación no se ve reflejado y se va — aunque el
-- recinto sirva perfectamente para lo suyo.
--
-- DE DÓNDE SALE CADA DATO. De la entrevista al dueño (`rediseño-sitio-web/14-RESPUESTAS-
-- NEGOCIO.md`) y de las tablas `salones`, `servicios` y `amenidades` de esta misma base.
-- **Ni una capacidad, ni un horario, ni un precio inventado.**
--
-- LOS ESPACIOS Y SERVICIOS RECOMENDADOS SON REALES. `espacios_recomendados` lleva slugs que
-- existen en `salones`; `servicios_relacionados` lleva títulos que existen en `servicios` o en
-- `amenidades`. Recomendar algo que no está en el catálogo sería prometer lo que no hay.
--
-- ADITIVA. Solo INSERT y UPDATE sobre `jardines.tipos_evento`. No toca esquema, ni políticas,
-- ni permisos, ni nada del schema `public` (Vero Seguros queda intacto).
--
-- POR QUÉ SON DOS ARCHIVOS Y NO UNO. Porque se aplicaron en dos pasos y la base registró dos
-- versiones. Un solo archivo con un prefijo que la base no conoce haría que `db push` lo
-- reejecutara — que es exactamente lo que cazó el contrato 1.1 al escribirlo de una pieza.
-- ════════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1 · BODAS — se quita la frase repetida
-- ─────────────────────────────────────────────────────────────────────────────
-- La descripción corta empezaba con «Casi siempre la boda lleva capilla», que es exactamente
-- la primera frase de la larga. En la página se pintan una debajo de otra, así que el
-- visitante leía lo mismo dos veces seguidas. El dueño lo cazó al instante.
--
-- La corta pasa a decir lo que la larga NO dice de entrada: el argumento de conjunto.
UPDATE jardines.tipos_evento SET
  descripcion_corta = $$Ceremonia y fiesta en el mismo terreno, sin que nadie tenga que trasladarse. Eliges entre tres recepciones muy distintas —el salón principal, el techado con temática de trajinera o los jardines abiertos— y hay hospedaje dentro para quien viene de lejos.$$,
  servicios_relacionados = '["Montajes hermosos y personalizables para tu evento","Mesa de Honor personalizada","Asesoría en decoración y logística","Coordinación de montaje y desmontaje","Seguridad privada durante el evento","Auto clásico","Cámara 360","Pista pixel led","Variedad en Grupos Musicales","Mesa de dulces personalizada","Set fotográfico"]'::jsonb
WHERE slug = 'bodas';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · XV AÑOS, INFANTILES, CORPORATIVOS, NOCTURNOS — se les pone lo recomendado
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE jardines.tipos_evento SET
  servicios_relacionados = '["Montajes hermosos y personalizables para tu evento","Mesa de Honor personalizada","Asesoría en decoración y logística","Pista pixel led","Mega pantalla led","Cámara 360","Chinelo","Variedad en Grupos Musicales","Mesa de dulces personalizada","Set fotográfico","Auto clásico"]'::jsonb
WHERE slug = 'xv-anos';

UPDATE jardines.tipos_evento SET
  servicios_relacionados = '["Inflables Infantiles","Futbolito Inflable","Trampolín","Gladiador","Aereobonji","Alberca","Mago","Mesa de dulces personalizada","Actividades recreativas","Seguridad privada durante el evento"]'::jsonb
WHERE slug = 'infantiles';

UPDATE jardines.tipos_evento SET
  servicios_relacionados = '["Sala para conferencias","Mega pantalla led","Coordinación de montaje y desmontaje","Estacionamiento amplio para invitados","Área de bar","Flexibilidad de horarios según tu evento","Seguridad privada durante el evento","Sanitarios amplios y limpios"]'::jsonb
WHERE slug = 'corporativos';

UPDATE jardines.tipos_evento SET
  servicios_relacionados = '["Eventos Nocturnos armalos a tu gusto","Pista pixel led","Mega pantalla led","Área de bar","Cámara 360","Variedad en Grupos Musicales","Seguridad privada durante el evento"]'::jsonb
WHERE slug = 'nocturnos';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · CUMPLEAÑOS — estaba vacío y apagado
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE jardines.tipos_evento SET
  nombre = 'Cumpleaños',
  descripcion_corta = $$Un cumpleaños no siempre necesita salón grande. Aquí caben desde una comida de treinta personas en el Quiosco hasta una fiesta de cuatrocientas en los Jardines, y el montaje se ajusta para que ninguna de las dos se sienta vacía.$$,
  descripcion_larga = $$Lo primero que decide un cumpleaños es el tamaño, y por eso aquí hay espacios muy distintos. Para una comida familiar de treinta a cincuenta personas está el Quiosco, al aire libre. Para algo intermedio, el Espacio Nocturno (Eclipse) recibe de 80 a 120 y funciona bien cuando la fiesta va a alargarse hasta tarde. El Salón Encanto va de 200 a 300 y viene con el Campo del Encanto, que tiene juegos. Y si son muchos, los Jardines llegan a 600.

No hay mínimo de personas. El número que ves en cada espacio es una recomendación para que no se sienta vacío, no un requisito: se han hecho eventos de cuarenta personas en salones grandes, y el montaje se ajusta con salas lounge y sillones para que el espacio se llene.

La renta incluye el espacio, las mesas a elegir entre redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel, y el montaje básico. El evento son seis horas en total: media hora de entrada, cinco horas activas y media de salida. La hora extra existe y casi siempre se pide sobre la marcha; se cobra como un porcentaje del precio final.

En comida hay menú de tres tiempos, taquiza, barbacoa y buffet. La diferencia entre formal e informal aquí es el servicio: si hay meseros y atención en mesa o no. Hay bebidas, bartender y bebidas preparadas, y si prefieres traer la comida de fuera se puede hablar, según el evento.

Lo que suele cambiar un cumpleaños de bueno a memorable son las amenidades: la mesa de dulces personalizada, la cámara 360, la pista pixel led, la mega pantalla led o un grupo en vivo. Van aparte de la renta y tienen precio fijo, así que se contrata solo lo que quieras.

El recinto es cerrado, con dos accesos y seguridad privada durante el evento, y el estacionamiento está dentro. Si la fiesta acaba tarde, hay hospedaje en el mismo terreno y se cobra por noche.$$,
  espacios_recomendados = '["quiosco","eclipse","salon-encanto","jardines","salon-de-los-espejos"]'::jsonb,
  servicios_relacionados = '["Mesa de dulces personalizada","Cámara 360","Pista pixel led","Mega pantalla led","Variedad en Grupos Musicales","Área de bar","Montajes hermosos y personalizables para tu evento","Set fotográfico"]'::jsonb,
  preguntas = $$[
    {"pregunta":"¿Hay un mínimo de personas para rentar?","respuesta":"No. El número mínimo que ves en cada espacio es una recomendación para que el salón no se vea vacío, no un requisito. Se han hecho eventos de cuarenta y cincuenta personas en salones grandes: el montaje se ajusta con salas lounge y sillones para que el espacio se sienta lleno."},
    {"pregunta":"¿Puedo traer mi propio pastel o la comida?","respuesta":"El pastel sí, sin problema. Si no contratas alimentos con nosotros, meter comida de fuera se puede hablar dependiendo del evento; coméntalo al cotizar."},
    {"pregunta":"¿Cuánto dura el evento?","respuesta":"Seis horas en total: media hora de entrada, cinco horas activas y media hora de salida. Si la fiesta se alarga, hay hora extra: casi siempre se pide sobre la marcha y se cobra como un porcentaje del precio final."},
    {"pregunta":"¿Qué espacio me conviene para mi número de invitados?","respuesta":"El Quiosco va de 30 a 50, Eclipse de 80 a 120, el Salón de los Espejos de 100 a 400, el Salón Encanto de 200 a 300 y los Jardines de 400 a 600. Dinos cuántos son y te decimos cuál le queda mejor a tu fiesta."}
  ]$$::jsonb,
  activo = true
WHERE slug = 'cumpleanos';

COMMIT;
