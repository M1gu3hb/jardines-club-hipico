-- ════════════════════════════════════════════════════════════════════════════════
-- sec_35b · Ocho tipos de evento nuevos
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

INSERT INTO jardines.tipos_evento
  (slug, nombre, descripcion_corta, descripcion_larga, espacios_recomendados, servicios_relacionados, preguntas, activo, orden)
VALUES

-- ── Bautizos y primeras comuniones ──────────────────────────────────────────
('bautizos', 'Bautizos y primeras comuniones',
 $$La capilla está dentro del recinto, así que la ceremonia y la comida ocurren en el mismo terreno. Nadie se sube al coche entre una cosa y la otra, y los abuelos lo agradecen más que nadie.$$,
 $$Un bautizo o una primera comunión tienen un problema clásico: la iglesia está en un sitio y la comida en otro, y entre las dos se pierde una hora, se desarma el grupo y la mitad de los invitados llega tarde. Aquí no pasa, porque la capilla está dentro del mismo terreno que el salón.

La capilla recibe de 50 a 150 personas y no está atada a un culto: se adapta a lo que ustedes crean y a cómo quieran llevar la ceremonia. También se renta sola, si solo necesitas ese espacio.

Para la comida, lo que mejor funciona en estos eventos es el Quiosco cuando son pocos —de 30 a 50, al aire libre— o el Salón Encanto, que es techado, va de 200 a 300 y trae incluido el Campo del Encanto con juegos: ahí los niños se entretienen solos mientras los adultos comen tranquilos. Si son muchos, el Salón de los Espejos llega a 400.

En comida, el menú de tres tiempos es lo más habitual en estos eventos, y también hay taquiza, barbacoa y buffet. La diferencia entre formal e informal es el servicio: si hay meseros y atención en mesa o no.

La renta incluye el espacio, las mesas a elegir, sillas Tiffany, mantel y cubremantel y el montaje básico. Son seis horas en total, cinco de ellas activas. El recinto es cerrado, con dos accesos y seguridad privada, así que los niños salen al patio sin salir de ningún sitio.$$,
 '["capilla","quiosco","salon-encanto","salon-de-los-espejos","area-infantil-pony"]'::jsonb,
 '["Montajes hermosos y personalizables para tu evento","Mesa de Honor personalizada","Mesa de dulces personalizada","Inflables Infantiles","Set fotográfico","Asesoría en decoración y logística","Seguridad privada durante el evento","Sanitarios amplios y limpios"]'::jsonb,
 $$[
   {"pregunta":"¿La capilla sirve para un bautizo?","respuesta":"Sí. Es un espacio de ceremonia que se adapta a lo que ustedes crean y a cómo quieran llevarla. Recibe de 50 a 150 personas y está dentro del mismo recinto que el salón, así que de la ceremonia se pasa a la comida caminando."},
   {"pregunta":"¿Podemos traer a nuestro propio sacerdote o ministro?","respuesta":"Coméntanoslo al cotizar y lo vemos contigo. La capilla es el espacio; quién oficia y cómo se lleva la ceremonia lo deciden ustedes."},
   {"pregunta":"¿Hay dónde entretener a los niños?","respuesta":"Sí. El Salón Encanto trae incluido el Campo del Encanto, que tiene juegos, y además está el Área Infantil. Se pueden sumar inflables, trampolín o un mago como amenidades aparte."},
   {"pregunta":"¿Se puede rentar solo la capilla?","respuesta":"Sí, se renta de forma independiente. Si solo necesitas el espacio para la ceremonia, se puede."}
 ]$$::jsonb,
 true, 7),

-- ── Presentaciones de tres años ─────────────────────────────────────────────
('presentaciones', 'Presentaciones de tres años',
 $$Ceremonia en la capilla y fiesta a continuación, sin traslados y sin prisas. Un evento corto que se disfruta más cuando todo ocurre en el mismo lugar.$$,
 $$La presentación de tres años es un evento breve y muy familiar, y precisamente por eso se arruina con los traslados: media hora de coches entre la iglesia y el salón se lleva por delante buena parte de la mañana. Aquí la capilla y el salón están en el mismo terreno.

La capilla recibe de 50 a 150 personas y se adapta a cómo quieran llevar la ceremonia. Para la comida posterior, el Quiosco funciona muy bien cuando son de 30 a 50; el Salón Encanto, techado y de 200 a 300, cuando la familia es grande y hay niños, porque incluye el Campo del Encanto con juegos.

No hay mínimo de personas: el número de cada espacio es una recomendación para que no se vea vacío, no un requisito, y el montaje se ajusta con salas lounge para que se sienta lleno.

La renta incluye el espacio, mesas, sillas Tiffany, mantel y cubremantel y el montaje básico. En comida hay menú de tres tiempos, taquiza, barbacoa y buffet, y la diferencia entre formal e informal es si hay meseros y atención en mesa.

Son seis horas en total —media de entrada, cinco activas y media de salida—, que para este tipo de evento suele sobrar. El recinto es cerrado, con estacionamiento dentro y seguridad privada durante el evento.$$,
 '["capilla","quiosco","salon-encanto","area-infantil-pony"]'::jsonb,
 '["Montajes hermosos y personalizables para tu evento","Mesa de dulces personalizada","Inflables Infantiles","Set fotográfico","Asesoría en decoración y logística","Sanitarios amplios y limpios","Estacionamiento amplio para invitados"]'::jsonb,
 $$[
   {"pregunta":"¿Se puede hacer la ceremonia y la comida el mismo día sin salir?","respuesta":"Sí, y es lo que casi todo el mundo hace aquí: la capilla y los salones están en el mismo terreno. De una cosa a la otra se va caminando."},
   {"pregunta":"Somos pocos, ¿hay algo más chico que un salón?","respuesta":"El Quiosco, al aire libre, va de 30 a 50 personas. Y si prefieres un salón aunque sean pocos, se puede: el montaje se ajusta para que no se vea vacío."},
   {"pregunta":"¿Cuánto dura?","respuesta":"La renta son seis horas en total: media de entrada, cinco activas y media de salida. Para una presentación suele sobrar tiempo."}
 ]$$::jsonb,
 true, 8),

-- ── Graduaciones ────────────────────────────────────────────────────────────
('graduaciones', 'Graduaciones',
 $$Desde una generación de kínder hasta una de universidad. Hay pantalla led para la ceremonia, escenario para los discursos y sitio de sobra en los Jardines si son muchos.$$,
 $$Una graduación tiene dos mitades que piden cosas distintas: primero una ceremonia —discursos, entrega de reconocimientos, fotos— y después una fiesta. El recinto da las dos sin cambiar de sitio.

Para la parte formal, el Salón de los Espejos es el que mejor funciona: es cerrado, con iluminación regulable y climatización, tiene escenario y pista de baile, y va de 100 a 400 personas. Se le puede sumar la mega pantalla led para proyectar el pase de lista, las fotos de la generación o el video que siempre hay. Y al rentarlo entra incluido el Campo Grande.

Si la generación es grande y quieren algo al aire libre, los Jardines reciben de 400 a 600. Si es una graduación de kínder o primaria, el Salón Encanto —techado, de 200 a 300— trae el Campo del Encanto con juegos, que resuelve el rato en que los niños ya no aguantan sentados.

La renta incluye el espacio, mesas a elegir, sillas Tiffany, mantel y cubremantel y el montaje básico. En comida hay menú de tres tiempos, taquiza, barbacoa y buffet. Son seis horas en total, cinco activas, y hay hora extra si la fiesta se alarga.

Para la parte de fiesta se pueden contratar la pista pixel led, la cámara 360, el set fotográfico o un grupo en vivo. Van aparte y tienen precio fijo.

El estacionamiento está dentro del recinto, que en un evento donde llegan familias enteras a la vez deja de ser un detalle.$$,
 '["salon-de-los-espejos","jardines","salon-encanto","eclipse"]'::jsonb,
 '["Mega pantalla led","Sala para conferencias","Pista pixel led","Cámara 360","Set fotográfico","Variedad en Grupos Musicales","Estacionamiento amplio para invitados","Coordinación de montaje y desmontaje","Área de bar"]'::jsonb,
 $$[
   {"pregunta":"¿Hay pantalla para proyectar el video de la generación?","respuesta":"Sí, la mega pantalla led se contrata como amenidad aparte. Se usa mucho en graduaciones para el pase de lista, las fotos y el video."},
   {"pregunta":"¿Hay escenario para los discursos?","respuesta":"El Salón de los Espejos tiene escenario y pista de baile, además de iluminación regulable y climatización. Es el que mejor funciona para la parte formal."},
   {"pregunta":"Somos una generación grande, ¿cabemos?","respuesta":"Los Jardines reciben de 400 a 600 personas y el Salón de los Espejos hasta 400. Dinos cuántos son y te decimos cuál le queda mejor."},
   {"pregunta":"¿Dónde se estacionan las familias?","respuesta":"Dentro del recinto. El estacionamiento es amplio y los invitados entran con el coche: no hay que buscar sitio en la calle ni pagar valet."}
 ]$$::jsonb,
 true, 9),

-- ── Baby showers y revelaciones ─────────────────────────────────────────────
('baby-showers', 'Baby showers y revelaciones',
 $$Un evento de día, al aire libre y con juegos, que pide más jardín que salón. El Quiosco y el Campo del Encanto son los que mejor le sientan.$$,
 $$Un baby shower es casi siempre de día, dura menos que una fiesta y se juega mucho: por eso funciona mejor en un espacio abierto que en un salón cerrado.

El Quiosco, al aire libre, recibe de 30 a 50 personas y es el más pedido para estos eventos. Si son más, el Salón Encanto es techado, va de 200 a 300 y trae incluido el Campo del Encanto: verde, con juegos, y con sitio de sobra para las dinámicas. Y si el grupo es grande y quieren estar entre áreas verdes, los Jardines llegan a 600.

Para una revelación de sexo, el jardín abierto es el sitio: hay espacio para la foto y para el video sin que nadie estorbe, y el fondo es verde de verdad, no una lona.

La renta incluye el espacio, las mesas a elegir, sillas Tiffany, mantel y cubremantel y el montaje básico. Son seis horas en total, cinco activas — para un baby shower suele sobrar bastante.

En comida hay menú de tres tiempos, taquiza, barbacoa y buffet, con o sin servicio de meseros. Y la mesa de dulces personalizada y el set fotográfico son las dos amenidades que más se piden en este tipo de evento.

El recinto es cerrado, con sanitarios amplios y estacionamiento dentro.$$,
 '["quiosco","salon-encanto","jardines","area-infantil-pony"]'::jsonb,
 '["Mesa de dulces personalizada","Set fotográfico","Montajes hermosos y personalizables para tu evento","Jardines naturales y vegetación ornamental","Asesoría en decoración y logística","Sanitarios amplios y limpios","Actividades recreativas"]'::jsonb,
 $$[
   {"pregunta":"Somos pocos, ¿hay un espacio chico?","respuesta":"El Quiosco, al aire libre, va de 30 a 50 personas y es el que más se pide para baby showers."},
   {"pregunta":"¿Se puede hacer al aire libre?","respuesta":"Sí. El Quiosco y los Jardines son abiertos, y el Salón Encanto es techado pero trae incluido el Campo del Encanto, que es verde y tiene juegos."},
   {"pregunta":"¿Y si llueve?","respuesta":"Depende del espacio. El Salón de los Espejos es cerrado. El Encanto tiene carpa. En los Jardines y el Quiosco no hay control del clima, pero se puede contratar carpa."},
   {"pregunta":"¿Hay sitio para las dinámicas y los juegos?","respuesta":"Sí. El Campo del Encanto entra con la renta del Salón Encanto y es donde suelen hacerse. También se pueden contratar actividades recreativas aparte."}
 ]$$::jsonb,
 true, 10),

-- ── Despedidas de soltera ───────────────────────────────────────────────────
('despedidas', 'Despedidas de soltera',
 $$Alberca, área de bar y hospedaje dentro del recinto: nadie tiene que manejar de regreso. Es de los pocos eventos donde poder quedarse a dormir cambia la noche entera.$$,
 $$Una despedida tiene una diferencia práctica con casi cualquier otro evento: se bebe, y alguien tiene que manejar de vuelta. Aquí no hace falta, porque hay hospedaje dentro del mismo terreno.

Son tres bungalows con salita, dormitorio con cama y baño con regadera, y dos dormitorios de literas, uno de hombres y uno de mujeres. Se cobra por noche y se reserva junto con el evento.

Para la fiesta, el Espacio Nocturno (Eclipse) es el que mejor le va: recibe de 80 a 120 personas y está pensado para cuando la noche cambia de tono. Si son más, el Salón Encanto va de 200 a 300. Y si quieren día de alberca antes de la noche, se puede contratar.

Hay área de bar, bebidas, bartender y bebidas preparadas. La pista pixel led y la cámara 360 son lo que más se contrata en estas fiestas, y también se puede llevar grupo en vivo.

La renta son seis horas en total, cinco activas, con media hora de entrada y media de salida. La hora extra existe y casi siempre se pide sobre la marcha; se cobra como un porcentaje del precio final.

El recinto es cerrado, con dos accesos y seguridad privada durante el evento. Eso, en una fiesta que acaba tarde, es lo que permite estar tranquilo.$$,
 '["eclipse","salon-encanto","estancias","jardines"]'::jsonb,
 '["Área de bar","Alberca","Pista pixel led","Cámara 360","Eventos Nocturnos armalos a tu gusto","Variedad en Grupos Musicales","Seguridad privada durante el evento","Set fotográfico"]'::jsonb,
 $$[
   {"pregunta":"¿Se puede quedar a dormir la gente?","respuesta":"Sí, hay hospedaje dentro del recinto: tres bungalows con salita, dormitorio y baño con regadera, y dos dormitorios de literas, uno de hombres y uno de mujeres. Se cobra por noche."},
   {"pregunta":"¿Hay alberca?","respuesta":"Sí, se contrata como amenidad aparte. Funciona bien para la parte de día, antes de la fiesta."},
   {"pregunta":"¿Hasta qué hora se puede?","respuesta":"La renta son seis horas en total, cinco activas. Si se alarga, hay hora extra: se pide sobre la marcha y se cobra como un porcentaje del precio final."},
   {"pregunta":"¿Hay seguridad?","respuesta":"Sí, seguridad privada durante todo el evento. El recinto es cerrado y solo tiene dos accesos."}
 ]$$::jsonb,
 true, 11),

-- ── Aniversarios de boda ────────────────────────────────────────────────────
('aniversarios', 'Aniversarios de boda',
 $$Bodas de plata, de oro o el aniversario que toque. Se puede renovar votos en la capilla y comer a continuación, con el mismo formato de una boda pero sin su complicación.$$,
 $$Un aniversario redondo —veinticinco, cincuenta años— suele querer las dos cosas de una boda: un momento de ceremonia y una comida en condiciones. Y las dos se pueden hacer aquí sin traslados.

La capilla recibe de 50 a 150 personas y sirve igual para una renovación de votos o una bendición que para una ceremonia religiosa: se adapta a lo que ustedes crean. Está dentro del mismo terreno que los salones.

Para la comida, el Salón de los Espejos es el más formal: cerrado, con climatización, iluminación regulable, escenario, pista de baile y barra de bar, de 100 a 400 personas, y al rentarlo entra el Campo Grande. Si son menos y prefieren algo más íntimo, el Quiosco al aire libre va de 30 a 50.

En comida, el menú de tres tiempos es el principal, y hay también taquiza, barbacoa y buffet. La diferencia entre formal e informal es el servicio: si hay meseros y atención en mesa.

La renta incluye el espacio, mesas a elegir, sillas Tiffany, mantel y cubremantel y el montaje básico. Son seis horas en total, cinco activas.

Y hay algo que en un aniversario pesa más que en otros eventos: casi siempre hay invitados mayores y gente que viene de fuera. El estacionamiento está dentro del recinto, no hay que caminar desde la calle, y si alguien no quiere manejar de regreso hay hospedaje en el mismo terreno.$$,
 '["capilla","salon-de-los-espejos","quiosco","jardines","estancias"]'::jsonb,
 '["Mesa de Honor personalizada","Montajes hermosos y personalizables para tu evento","Variedad en Grupos Musicales","Set fotográfico","Área de bar","Asesoría en decoración y logística","Estacionamiento amplio para invitados","Mesa de dulces personalizada"]'::jsonb,
 $$[
   {"pregunta":"¿Se pueden renovar los votos aquí?","respuesta":"Sí. La capilla sirve para una renovación de votos, una bendición o una ceremonia religiosa: se adapta a lo que ustedes crean. Recibe de 50 a 150 personas y está en el mismo terreno que los salones."},
   {"pregunta":"Vienen familiares de fuera, ¿dónde se quedan?","respuesta":"Hay hospedaje dentro del recinto: tres bungalows con salita, dormitorio y baño con regadera, y dos dormitorios de literas. Se cobra por noche."},
   {"pregunta":"Hay personas mayores, ¿está cómodo el acceso?","respuesta":"El estacionamiento está dentro del recinto y los invitados entran con el coche, así que no hay que caminar desde la calle. Los sanitarios son amplios y el terreno está acondicionado."},
   {"pregunta":"Somos pocos, ¿hay algo más íntimo que un salón?","respuesta":"El Quiosco, al aire libre, va de 30 a 50 personas. Y si prefieres un salón aunque sean pocos, el montaje se ajusta para que no se vea vacío."}
 ]$$::jsonb,
 true, 12),

-- ── Posadas y fin de año ────────────────────────────────────────────────────
('posadas', 'Posadas y fin de año',
 $$Diciembre se llena rápido y son las fechas que primero se apartan. Hay espacios techados para el frío, campo abierto para la piñata y estacionamiento dentro.$$,
 $$Las posadas y las cenas de fin de año tienen una particularidad que conviene saber antes que ninguna otra: son las fechas que primero se ocupan. Diciembre se aparta con meses de antelación, así que si es lo tuyo, la visita conviene agendarla pronto.

Para el frío de diciembre, lo que mejor funciona son los espacios techados. El Salón de los Espejos es cerrado y tiene climatización, va de 100 a 400 personas y trae incluido el Campo Grande. El Salón Encanto es techado, de 200 a 300, e incluye el Campo del Encanto — que es donde acaba yendo la piñata, porque hace falta espacio y algo de altura.

Si es una posada de empresa y son muchos, los Jardines llegan a 600 personas.

En comida hay menú de tres tiempos, taquiza, barbacoa y buffet, y la diferencia entre formal e informal es si hay meseros y atención en mesa. Hay área de bar, bebidas y bartender.

La renta incluye el espacio, mesas a elegir, sillas Tiffany, mantel y cubremantel y el montaje básico. Son seis horas en total, cinco activas, con hora extra si se alarga.

Para el ambiente se pueden contratar la pista pixel led, la mega pantalla led, un grupo musical en vivo o el chinelo, que es de lo más pedido en fechas así. Y se puede sumar planta de luz, que funciona como seguro del evento por si se va la luz.

El estacionamiento está dentro y hay seguridad privada durante todo el evento.$$,
 '["salon-de-los-espejos","salon-encanto","jardines","eclipse"]'::jsonb,
 '["Variedad en Grupos Musicales","Chinelo","Pista pixel led","Mega pantalla led","Área de bar","Montajes hermosos y personalizables para tu evento","Estacionamiento amplio para invitados","Seguridad privada durante el evento"]'::jsonb,
 $$[
   {"pregunta":"¿Con cuánta anticipación hay que apartar diciembre?","respuesta":"Cuanto antes. Son las fechas que primero se ocupan, así que conviene agendar la visita pronto: la fecha queda apartada en el momento en que entra un anticipo."},
   {"pregunta":"¿Hay espacios techados para el frío?","respuesta":"Sí. El Salón de los Espejos es cerrado y tiene climatización; el Salón Encanto es techado. Los dos traen incluido su campo, que es donde suele acabar la piñata."},
   {"pregunta":"¿Y si se va la luz?","respuesta":"Se puede contratar planta de luz, que funciona como seguro del evento."},
   {"pregunta":"Es una posada de empresa, somos muchos. ¿Cabemos?","respuesta":"Los Jardines reciben de 400 a 600 personas y el Salón de los Espejos hasta 400. Dinos cuántos son y te decimos qué espacio le queda mejor."}
 ]$$::jsonb,
 true, 13),

-- ── Reuniones y comidas familiares ──────────────────────────────────────────
('reuniones', 'Reuniones y comidas familiares',
 $$No todo evento necesita salón, montaje y protocolo. A veces es una comida de treinta personas al aire libre, y para eso está el Quiosco.$$,
 $$Hay eventos que no son una fiesta: una comida de la familia, una reunión de amigos, un festejo sin motivo concreto. Para eso no hace falta un salón de cuatrocientas personas ni un montaje formal, y forzarlo sale caro y se ve raro.

El Quiosco es el espacio para esto: al aire libre, de 30 a 50 personas, entre las áreas verdes del recinto. Si son más, el Salón Encanto es techado, va de 200 a 300 y trae incluido el Campo del Encanto con juegos, que resuelve la parte de los niños sin que nadie tenga que estar pendiente.

No hay mínimo de personas. El número de cada espacio es una recomendación para que no se vea vacío, no un requisito.

La renta incluye el espacio, las mesas a elegir entre redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel, y el montaje básico. Son seis horas en total, cinco activas.

En comida, para este tipo de reunión lo que más se pide es la taquiza y la barbacoa, aunque también hay menú de tres tiempos y buffet. Si prefieres traer la comida de fuera, se puede hablar según el evento.

El recinto es cerrado, con estacionamiento dentro, sanitarios amplios y áreas verdes por las que caminar. Y si alguien viene de lejos, hay hospedaje en el mismo terreno, que se cobra por noche.$$,
 '["quiosco","salon-encanto","jardines","area-infantil-pony","estancias"]'::jsonb,
 '["Jardines naturales y vegetación ornamental","Área de bar","Actividades recreativas","Sanitarios amplios y limpios","Estacionamiento amplio para invitados","Inflables Infantiles","Futbolito Inflable"]'::jsonb,
 $$[
   {"pregunta":"Somos treinta personas, ¿no es muy poco?","respuesta":"No. El Quiosco está pensado justo para eso: al aire libre, de 30 a 50 personas. Y no hay mínimo de renta en ningún espacio."},
   {"pregunta":"¿Podemos traer nuestra propia comida?","respuesta":"Se puede hablar dependiendo del evento. Si prefieres contratar con nosotros, para estas reuniones lo que más se pide es la taquiza y la barbacoa."},
   {"pregunta":"¿Hay dónde dejar a los niños?","respuesta":"El Salón Encanto trae incluido el Campo del Encanto, que tiene juegos, y está el Área Infantil. También se pueden contratar inflables o futbolito como amenidades aparte."},
   {"pregunta":"¿Hay estacionamiento?","respuesta":"Sí, dentro del recinto y amplio. Los invitados entran con el coche."}
 ]$$::jsonb,
 true, 14)

ON CONFLICT (slug) DO NOTHING;

COMMIT;
