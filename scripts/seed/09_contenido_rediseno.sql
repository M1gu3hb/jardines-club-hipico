-- ════════════════════════════════════════════════════════════════════════════
-- 06 · CONTENIDO DEL REDISEÑO (2026-08-24)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Carga el contenido escrito a partir de la entrevista al dueño
-- (rediseño-sitio-web/14-RESPUESTAS-NEGOCIO.md).
--
-- QUE TRAE:
--   · 5 tipos de evento con descripcion larga propia (373-673 palabras cada uno),
--     descripcion corta, metadatos de buscador, espacios recomendados y sus preguntas.
--      cumpleanos NO entra: no se escribio contenido para el y sigue apagado.
--   · Los 8 espacios con descripcion larga ampliada, metadatos, datos rapidos y preguntas.
--
-- COMO SE ESCRIBIO, porque importa para saber cuanto fiarse:
--   1. Seis redactores en paralelo, cada uno leyendo las respuestas del dueño y el contenido
--      que ya tenia el sitio.
--   2. Una pasada de verificacion ADVERSARIA que encontro 80 afirmaciones sin respaldo, 33
--      frases que tocaban temas vetados y 41 de relleno. Ninguna llego a la base.
--   3. Una ronda de correccion y una SEGUNDA verificacion. Los 21 reparos que sobrevivieron
--      se arreglaron a mano, uno por uno.
--
-- LO QUE NO CONTIENE, y es deliberado:
--   · Ni una cifra de dinero. Ni desde, ni rangos, ni porcentajes.
--   · Nada sobre la politica de cancelacion ni sobre si el anticipo se devuelve.
--   · Ningun nombre propio de persona.
--   · Ninguna fecha ni año de fundacion: el dueño no lo sabe.
--   · La arena del Salon Encanto, la ferreteria de los abuelos y el evento de ~6000 personas.
--
-- ESTE ARCHIVO NO SE VUELVE A EJECUTAR. Es la carga inicial: a partir de aqui el contenido se
-- edita desde el panel, y volver a correrlo pisaria lo que el dueño haya cambiado.

update jardines.tipos_evento set
  descripcion_corta      = 'Casi siempre la boda lleva capilla, y la ceremonia y la fiesta pasan en el mismo terreno. Eliges entre el Salón de los Espejos, el Salón Encanto o los Jardines, y hay un bungalow para que te arregles.',
  descripcion_larga      = 'Casi siempre la boda lleva capilla. La ceremonia y la fiesta pasan en el mismo terreno, así que nadie tiene que salir ni trasladarse entre una cosa y la otra. La capilla se adapta a lo que el cliente quiera: puede ser católica o ajustarse a como tú la quieras ver. Recibe de 50 a 150 personas y, si solo te interesa eso, también se puede rentar por separado.

Para la recepción hay tres caminos, que son los que la gente elige de verdad. El Salón de los Espejos es el salón principal y ahí se van las bodas más formales: es cerrado, con iluminación regulable y climatización, escenario, pista de baile, cocina equipada dentro del salón y barra de bar. Va de 100 a 400 personas, y al rentarlo entra incluido el Campo Grande.

El Salón Encanto gusta por su temática de trajinera; estamos en Xochimilco. Es techado, va de 200 a 300 personas y con la renta entra el Campo del Encanto, que tiene juegos.

Los Jardines se decoran con un caminito, una alfombra y flores, y son el espacio abierto grande: de 400 a 600 personas rodeadas de áreas verdes.

Si llueve, cada espacio responde distinto. En el Salón de los Espejos no pasa nada, porque es cerrado. El Encanto tiene carpa. En los Jardines no hay control del clima, pero se puede contratar carpa.

Para arreglarte se te ofrece un bungalow de las Estancias, dentro del recinto: tiene salita, un dormitorio con cama y baño con regadera.

La renta incluye el espacio con todo lo que ves anunciado en él, las mesas a elegir entre redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel, y el montaje básico: mesa, sillas, mantel y listo. Si prefieres otro modelo de silla se puede, pero sube el costo. El evento son seis horas en total: media hora de entrada, cinco horas activas y media hora de salida. La hora extra existe, casi siempre se pide sobre la marcha y no antes, y se cobra como un porcentaje del precio final.

En comida, el menú de tres tiempos es el principal, y también hay taquiza, barbacoa y buffet. Aquí la diferencia entre formal e informal es el servicio: si hay meseros y atención a mesa o no. Eso se maneja sobre todo en el buffet. Hay bebidas, bartender y bebidas preparadas. Si no contratas alimentos con nosotros, meter comida de fuera se puede, dependiendo del evento.

Las amenidades y los servicios van aparte y tienen precio fijo. Entre las que se pueden contratar están el auto clásico, la pista pixel led, la cámara 360, la mega pantalla led, el set fotográfico, los grupos musicales en vivo, los chinelos y la mesa de dulces personalizada. Y se puede sumar planta de luz, que es un seguro para el evento, que se vaya la luz o que pase algo.

Casi todas las bodas llevan maestro de ceremonias. Alegra la fiesta, y es de las pocas cosas que casi nadie se salta.

Todo pasa dentro de las instalaciones: no tienen que salir. La seguridad está aquí. Los niños salen al patio, pero el lugar es cerrado y solo hay dos accesos. Y si la fiesta acaba tarde o tienes invitados que vienen de lejos, hay hospedaje en el mismo terreno: tres bungalows con salita, dormitorio con cama y baño con regadera, y dos dormitorios de literas, uno de hombres y uno de mujeres. Se cobra por noche.

La renta del salón y la comida se cobran por persona, así que el costo depende de cuántos sean ustedes: se cotiza en la visita. Agéndala con al menos un día de anticipación, con fecha y hora, porque es importante que conozcas el lugar antes de decidir. La fecha queda apartada en el momento en que entra un anticipo —no hay un monto fijo, se acuerda— y de ahí se arma un plan de pagos; una semana antes del evento todo tiene que quedar liquidado. Se paga por transferencia o en efectivo: no hay terminal, así que tarjeta no. Las solicitudes las contesta el dueño en persona, por WhatsApp.',
  seo_title              = 'Bodas en Xochimilco | Jardines Club Hípico',
  seo_description        = 'Capilla, salón o jardín para tu boda en Xochimilco. Sillas Tiffany y montaje incluidos, bungalow para que se arregle la novia y hospedaje adentro.',
  espacios_recomendados  = '["capilla", "salon-de-los-espejos", "salon-encanto", "jardines", "estancias"]'::jsonb,
  preguntas              = '[{"pregunta": "¿Podemos hacer la ceremonia religiosa aquí mismo?", "respuesta": "Sí. Casi siempre la boda lleva capilla, y está dentro del mismo recinto: la ceremonia y la fiesta pasan en el mismo terreno, sin traslados. La capilla se adapta a lo que el cliente quiera, puede ser católica o ajustarse a como tú la quieras ver, y recibe de 50 a 150 personas. También se puede rentar sola, sin recepción."}, {"pregunta": "¿Hay un lugar para que se arregle la novia?", "respuesta": "Sí. Se te ofrece un bungalow de las Estancias, dentro del recinto: tiene salita, un dormitorio con cama y baño con regadera."}, {"pregunta": "¿Y si llueve el día de la boda?", "respuesta": "Depende del espacio que elijas. El Salón de los Espejos es cerrado, así que no pasa nada. El Salón Encanto tiene carpa. En los Jardines no hay control del clima, pero se puede contratar carpa."}, {"pregunta": "¿Qué incluye la renta del salón?", "respuesta": "El espacio con todo lo que ves anunciado en él, las mesas a elegir entre redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel, y el montaje básico: mesa, sillas, mantel y listo. Si rentas el Salón de los Espejos entra además el Campo Grande; si rentas el Salón Encanto entra el Campo del Encanto, que tiene juegos. Otro modelo de silla se puede, pero sube el costo."}, {"pregunta": "¿Cuánto dura el evento? ¿Se puede pedir hora extra?", "respuesta": "Son seis horas en total: media hora de entrada, cinco horas activas y media hora de salida. La hora extra sí existe, casi siempre se pide sobre la marcha y no antes, y se cobra como un porcentaje del precio final."}, {"pregunta": "¿Cómo aparto mi fecha?", "respuesta": "Primero ven a conocer el lugar: la visita se agenda con al menos un día de anticipación, con fecha y hora. La fecha queda apartada en el momento en que entra un anticipo, y no hay un monto fijo, se acuerda. De ahí se arma un plan de pagos y, una semana antes del evento, todo tiene que quedar liquidado. Se paga por transferencia o en efectivo; no hay terminal, así que tarjeta no. Te atiende directamente el dueño, por WhatsApp."}]'::jsonb
 where slug = 'bodas';

update jardines.tipos_evento set
  descripcion_corta      = 'Salón cerrado, salón techado o jardín abierto, con capilla dentro del mismo recinto si va a haber misa. La quinceañera se arregla en un bungalow de las Estancias, sin salir del lugar.',
  descripcion_larga      = 'Para unos XV años puedes usar un salón cerrado, uno techado o el jardín abierto.

El Salón de los Espejos es el salón principal: cerrado, con iluminación regulable y climatización, escenario, pista de baile, cocina equipada dentro del salón y barra de bar. Va de 100 a 400 personas y con su renta entra incluido el Campo Grande. El Salón Encanto es techado y tiene temática de trajinera; va de 200 a 300 personas y con la renta entra el Campo del Encanto, que tiene juegos. Los Jardines son el espacio abierto grande, de 400 a 600 personas entre áreas verdes.

Si llueve, en el Salón de los Espejos no pasa nada porque es cerrado, el Encanto tiene carpa, y para los Jardines se puede contratar carpa.

Si va a haber misa, la capilla está dentro del mismo recinto y recibe de 50 a 150 personas. Puede contratarse junto con el salón o rentarse sola. Nadie se traslada: la ceremonia y la fiesta ocurren en el mismo terreno.

Para que la quinceañera se arregle se le ofrece un bungalow de las Estancias, dentro del recinto: salita, un dormitorio con cama y baño con regadera.

La renta incluye el espacio con todo lo que ves anunciado en él, mesas a elegir entre redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel, y el montaje básico: mesa, sillas, mantel y listo. Otro modelo de silla se puede, pero sube el costo. El evento dura seis horas en total: media hora de entrada, cinco horas activas y media hora de salida. La hora extra existe, casi siempre se pide sobre la marcha y no antes, y se cobra como un porcentaje del precio final.

De comer, el menú de tres tiempos es el principal; también hay taquiza, barbacoa y buffet. La diferencia entre formal e informal aquí es el servicio, o sea si hay meseros y atención a mesa o no, y eso se maneja sobre todo en el buffet. Hay bebidas, bartender y bebidas preparadas. Si no contratas alimentos con nosotros, meter comida de fuera se puede, dependiendo del evento.

Las amenidades y los servicios se contratan aparte y tienen precio fijo. Entre las que hay: pista pixel led, cámara 360, mega pantalla led, mesa de dulces personalizada, set fotográfico, auto clásico, grupos musicales en vivo y chinelos. Si entre los invitados hay niños chicos, también hay inflables, futbolito inflable, trampolines, gladiador, aereobonji, alberca y un mago. Y se puede sumar planta de luz, que es un seguro para el evento, que se vaya la luz o que pase algo.

También está el Eclipse, el espacio nocturno: tipo night club, con cabina de DJ, pista de baile, iluminación led, área lounge y proyector con pantalla gigante, para 80 a 120 personas.

Todo pasa dentro de las instalaciones: no tienen que salir. La seguridad está aquí y el lugar es cerrado, con solo dos accesos. Si el festejo termina tarde o hay familia que viene de lejos, dentro hay hospedaje: tres bungalows con salita, dormitorio con cama y baño con regadera, y dos dormitorios de literas, uno de hombres y uno de mujeres. Se cobra por noche.

La renta del salón y la comida se cobran por persona, así que el costo depende de cuántos sean: se cotiza en la visita. Agéndala con al menos un día de anticipación, con fecha y hora, y ven a conocer el lugar. La fecha se aparta en el momento en que entra un anticipo —no hay un monto fijo, se acuerda— y después se arma un plan de pagos; una semana antes del evento todo queda liquidado. Se paga por transferencia o en efectivo, porque no hay terminal para tarjeta. Las solicitudes las contesta el dueño en persona, por WhatsApp.',
  seo_title              = 'XV años en Xochimilco | Jardines Club Hípico',
  seo_description        = 'Salón o jardín para tus XV años en Xochimilco. Capilla, bungalow para arreglarte, pista pixel led, cámara 360 y hospedaje en el mismo lugar.',
  espacios_recomendados  = '["salon-de-los-espejos", "salon-encanto", "jardines", "eclipse"]'::jsonb,
  preguntas              = '[{"pregunta": "¿Dónde se arregla la quinceañera?", "respuesta": "Se le ofrece un bungalow de las Estancias, dentro del mismo recinto: salita, un dormitorio con cama y baño con regadera."}, {"pregunta": "¿Se puede hacer la misa en el mismo lugar?", "respuesta": "Sí. La capilla está dentro del recinto y recibe de 50 a 150 personas. Se puede contratar junto con el salón o rentarse sola. Nadie tiene que trasladarse entre la ceremonia y la fiesta."}, {"pregunta": "¿Qué espacio me conviene según cuántos invitados seamos?", "respuesta": "El Salón de los Espejos es el salón principal, cerrado, y va de 100 a 400 personas. El Salón Encanto es techado, con temática de trajinera, y va de 200 a 300. Los Jardines son el espacio abierto grande, de 400 a 600. Y el Eclipse, el espacio nocturno tipo night club, es de 80 a 120. Al rentar los Espejos entra el Campo Grande, y al rentar el Encanto entra el Campo del Encanto, que tiene juegos."}, {"pregunta": "¿Qué amenidades hay?", "respuesta": "Hay pista pixel led, cámara 360, mega pantalla led, mesa de dulces personalizada, set fotográfico, auto clásico, grupos musicales en vivo y chinelos. Si entre los invitados hay niños chicos, también inflables, futbolito inflable, trampolines, gladiador, aereobonji, alberca y un mago. Todo eso se contrata aparte de la renta y tiene precio fijo."}, {"pregunta": "¿Cuánto dura el evento y qué incluye la renta?", "respuesta": "Seis horas en total: media hora de entrada, cinco horas activas y media hora de salida. La hora extra existe, casi siempre se pide sobre la marcha y no antes, y se cobra como un porcentaje del precio final. La renta incluye el espacio con todo lo que ves anunciado en él, mesas a elegir entre redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel, y el montaje básico: mesa, sillas, mantel y listo."}, {"pregunta": "¿Los invitados se pueden quedar a dormir?", "respuesta": "Sí, hay hospedaje dentro del mismo terreno: tres bungalows con salita, dormitorio con cama y baño con regadera, y dos dormitorios de literas, uno de hombres y uno de mujeres. Se cobra por noche. Sirve sobre todo cuando el evento acaba tarde o cuando hay quien no tiene cómo regresarse."}]'::jsonb
 where slug = 'xv-anos';

update jardines.tipos_evento set
  descripcion_corta      = 'Un patio grande al aire libre y todos los juegos que se ven, tirolesa incluida, ya vienen con la renta del área. Se llama Pony pero no hay ponis: es el espacio de los niños y el nombre viene del recinto. Todo dentro de un terreno cerrado, con dos accesos y seguridad privada.',
  descripcion_larga      = 'Antes que nada: no hay ponis. El área se llama Pony porque el lugar se llama Jardines Club Hípico y ese espacio es el de los niños. Lo decimos de frente para que nadie llegue con esa idea.

Lo que sí hay es un patio grande al aire libre y todos los juegos que se ven, tirolesa incluida. Y ya vienen con la renta del área. El área trabaja para grupos de 100 a 150 personas.

Si le quieres subir, las amenidades se contratan aparte: inflables infantiles, futbolito inflable, gladiador, aereobonji, alberca y mago. La renta del espacio y los alimentos se cobran por persona; las amenidades y los servicios tienen precio fijo.

El recinto está cerrado. Son más de dos hectáreas con solo dos accesos, con seguridad privada durante el evento y estacionamiento dentro del terreno. Los niños salen al patio, pero el lugar es cerrado. Nadie tiene que salir ni trasladarse entre una cosa y otra: todo pasa en el mismo terreno.

El Salón de los Espejos tiene área recreativa infantil con alberca de pelotas. Y si rentas el Salón Encanto, entra con él el Campo del Encanto, que también tiene juegos.

De tiempos: el evento son seis horas en total, de las cuales cinco son activas. Media hora de entrada y media hora de salida. Si la fiesta se alarga, hay hora extra; casi siempre se pide sobre la marcha, no antes.

Lo que ya viene con la renta además del espacio: las mesas, que eliges redondas, cuadradas o rectangulares; las sillas Tiffany; el mantel y el cubremantel; y el montaje básico. Si quieres otro modelo de silla se puede, y eso sí sube el costo.

De comer hay menú de tres tiempos, taquiza, barbacoa o buffet. El buffet puede ir con servicio, es decir con meseros y atención a mesa, o sin servicio. Hay bebidas, bartender y bebidas preparadas. Y si prefieres traer la comida por tu cuenta se puede, dependiendo del evento.

Si el festejo se hace noche, adentro hay estancias: tres bungalows con salita, baño con regadera y un dormitorio con cama, y dos dormitorios completos de literas. Se cobran por noche.

Antes de apartar, ven a conocerlo. La visita es con cita, con mínimo un día de anticipación y con hora establecida. La fecha queda apartada en el momento en que entra el anticipo, y no hay un monto fijo. Quien te contesta por WhatsApp es el dueño.',
  seo_title              = 'Fiestas infantiles en Xochimilco | Jardines Club Hípico',
  seo_description        = 'Área infantil con patio, tirolesa y los juegos que se ven, incluidos con la renta del área. Recinto cerrado con dos accesos y seguridad. Ojo: no hay ponis.',
  espacios_recomendados  = '["area-infantil-pony", "jardines", "salon-encanto", "quiosco"]'::jsonb,
  preguntas              = '[{"pregunta": "¿Hay ponis o caballos?", "respuesta": "No, ninguno de los dos. El área se llama Pony porque el recinto se llama Jardines Club Hípico y ese es el espacio de los niños. Aquí antes hubo un club ecuestre y se daban clases de equitación, pero hoy ya no hay caballos, y tampoco damos shows de caballos."}, {"pregunta": "¿Los juegos se pagan aparte?", "respuesta": "Los juegos que ves en el área ya vienen incluidos con la renta, tirolesa incluida. Lo que sí va aparte son las amenidades que se contratan, como inflables infantiles, futbolito inflable, gladiador, aereobonji, alberca y mago."}, {"pregunta": "¿Qué tan seguro es para los niños?", "respuesta": "El recinto está cerrado: más de dos hectáreas con solo dos accesos, y hay seguridad privada durante el evento. Los niños salen al patio, pero el lugar es cerrado. El estacionamiento también está adentro, así que no tienen que salir."}, {"pregunta": "¿Cuánto dura la fiesta?", "respuesta": "Seis horas en total, de las cuales cinco son activas: media hora de entrada y media hora de salida. Si la fiesta se alarga hay hora extra, y casi siempre se pide sobre la marcha, no antes."}, {"pregunta": "¿Puedo traer la comida?", "respuesta": "Sí se puede, dependiendo del evento. Si no contratas los alimentos con nosotros, la comida corre por tu cuenta. Y si prefieres que la pongamos nosotros, hay menú de tres tiempos, taquiza, barbacoa y buffet; el buffet puede ir con servicio, con meseros y atención a mesa, o sin servicio."}]'::jsonb
 where slug = 'infantiles';

update jardines.tipos_evento set
  descripcion_corta      = 'El Salón de los Espejos o el Salón Encanto montados como sala de conferencias. Te damos el equipo —proyector, pantalla, sillas, WiFi— o traes el tuyo y rentas solo el espacio. Estacionamiento, seguridad privada y planta de luz opcional dentro del recinto.',
  descripcion_larga      = 'Para una junta, una capacitación, una presentación o una convivencia de empresa se renta el Salón de los Espejos o el Salón Encanto y se monta como sala de conferencias.

Te podemos dar todo el equipo: proyector, pantalla, sillas, WiFi, lo que necesiten. O traes el tuyo y rentas nada más el espacio.

El Salón de los Espejos es el techado grande, de 100 a 400 personas, con iluminación regulable, climatización, escenario, cocina equipada dentro del mismo salón, barra de bar, baños amplios y un patio exterior para salir a tomar aire entre bloques. Con su renta entra además el Campo Grande. El Salón Encanto va de 200 a 300 personas, también techado, y mantiene la vista hacia los jardines; con él entra el Campo del Encanto. Si la reunión es chica, el Quiosco es una terraza techada con jardín propio, fuente y parrilla, para 30 a 50 personas.

De tiempos: seis horas en total, cinco activas. Media hora de entrada y media hora de salida. Si la sesión se alarga hay hora extra, y casi siempre se pide sobre la marcha, no antes.

Lo que ya viene incluido con la renta: las mesas, que eliges redondas, cuadradas o rectangulares según cómo te sirva mejor el acomodo; las sillas Tiffany; mantel y cubremantel; y el montaje básico. Elegir otro modelo de silla se puede y sube el costo.

De alimentos hay menú de tres tiempos, taquiza, barbacoa o buffet. El buffet puede ir con servicio, con meseros y atención a mesa, o sin servicio. Hay bebidas, bartender y bebidas preparadas. También puedes traer alimentos de fuera, dependiendo del evento.

El estacionamiento está dentro del recinto. Hay seguridad privada durante el evento y el terreno está cerrado, con solo dos accesos en más de dos hectáreas. Y hay planta de luz opcional: siempre intentamos incluirla, porque es un seguro para el evento, literal, que se vaya la luz o que pase algo.

Para retiros hay hospedaje adentro. Son dos dormitorios completos de literas, uno de hombres y uno de mujeres, que se usan justamente para retiros donde se queda mucha gente, más tres bungalows con salita, baño con regadera y un dormitorio con cama. El hospedaje se cobra por noche.

Y si lo que quieres no es una junta sino una convivencia, las amenidades se contratan aparte: futbolito inflable, gladiador, aereobonji, cámara 360, mega pantalla LED, alberca y variedad de grupos musicales. La renta del espacio y los alimentos se cobran por persona; las amenidades y los servicios tienen precio fijo.

Estamos en Xochimilco, Ciudad de México. Antes de apartar conviene que vengas a verlo. La visita es con cita previa, con mínimo un día de anticipación y con hora establecida. La fecha se aparta en el momento en que entra el anticipo, y no hay un monto fijo. Quien te contesta por WhatsApp es el dueño.',
  seo_title              = 'Eventos corporativos en Xochimilco | Jardines Club Hípico',
  seo_description        = 'Salones techados montados como sala de conferencias: proyector, pantalla, sillas y WiFi, o trae tu equipo. Estacionamiento y seguridad adentro.',
  espacios_recomendados  = '["salon-de-los-espejos", "salon-encanto", "quiosco"]'::jsonb,
  preguntas              = '[{"pregunta": "¿Ustedes ponen el equipo audiovisual o llevo el mío?", "respuesta": "Las dos cosas funcionan. Te podemos dar proyector, pantalla, sillas y WiFi, o rentarte nada más el espacio si traes tu propio equipo."}, {"pregunta": "¿Qué espacio se usa para una conferencia?", "respuesta": "El Salón de los Espejos o el Salón Encanto, montados como sala de conferencias. El primero es techado y va de 100 a 400 personas; el Encanto, también techado, de 200 a 300. Para grupos chicos está el Quiosco, de 30 a 50 personas."}, {"pregunta": "¿Cuánto tiempo tenemos el espacio?", "respuesta": "Seis horas en total y cinco activas, con media hora de entrada y media hora de salida. Si la sesión se alarga hay hora extra, que casi siempre se pide sobre la marcha, no antes."}, {"pregunta": "¿Hay hospedaje para un retiro?", "respuesta": "Adentro hay dos dormitorios completos de literas, uno de hombres y uno de mujeres, que se usan justamente para retiros donde se queda mucha gente, más tres bungalows con salita, baño con regadera y un dormitorio con cama. El hospedaje se cobra por noche."}, {"pregunta": "¿Se puede contratar planta de luz?", "respuesta": "Sí, es opcional. Siempre intentamos incluirla, porque es un seguro para el evento, literal: que se vaya la luz o que pase algo."}]'::jsonb
 where slug = 'corporativos';

update jardines.tipos_evento set
  descripcion_corta      = 'El Eclipse es como un night club dentro del recinto: cabina de DJ, pista de baile, proyector con pantalla gigante, iluminación LED y área lounge con mesas y sillones. Para 80 a 120 personas, con hospedaje adentro para quien acabe tarde.',
  descripcion_larga      = 'El Eclipse es como un night club, literal, dentro del recinto. Está hecho para música, para tomar algo y para tener una proyección. Es un ambiente de noche.

El espacio trabaja para 80 a 120 personas y ya viene armado: cabina de DJ, sistema de sonido para música y presentaciones, pista de baile amplia, proyector con pantalla gigante e iluminación LED tipo antro. La ambientación nocturna es personalizable. Hay área lounge con mesas y sillones, y hay servicio de bebidas.

Funciona para cumpleaños, graduaciones, after parties, reuniones con amigos y eventos temáticos. El espacio admite decoración temática si quieres montarlo con un concepto.

Si le quieres subir, hay amenidades que se contratan aparte: pista pixel LED, mega pantalla LED, cámara 360 para que la gente se lleve el video, set fotográfico, auto clásico para las fotos, variedad de grupos musicales en vivo y chinelos. La renta del espacio y los alimentos se cobran por persona; las amenidades y los servicios tienen precio fijo.

De comer hay menú de tres tiempos, taquiza, barbacoa o buffet. El buffet puede ir con servicio, con meseros y atención a mesa, o sin servicio. Hay bartender y bebidas preparadas.

El evento son seis horas en total, de las cuales cinco son activas, con media hora de entrada y media hora de salida. La hora extra existe y casi siempre se pide sobre la marcha, no antes.

El estacionamiento está dentro. Hay seguridad privada durante el evento. Y el terreno está cerrado, con solo dos accesos en más de dos hectáreas.

Y para lo que pasa cuando se acaba: adentro hay estancias, y sirven exactamente para esto, para eventos que terminan tarde y para quien no tiene cómo regresarse. Son tres bungalows, cada uno con salita, baño con regadera y un dormitorio con cama, y dos dormitorios completos de literas, uno de hombres y uno de mujeres. Se cobran por noche.

Estamos en Xochimilco, Ciudad de México. Antes de apartar conviene que vengas a verlo. La visita es con cita, con mínimo un día de anticipación y con hora establecida. La fecha se aparta en el momento en que entra el anticipo, y no hay un monto fijo. Quien te contesta por WhatsApp es el dueño.',
  seo_title              = 'Eventos nocturnos en el Eclipse | Jardines Club Hípico',
  seo_description        = 'Espacio como night club para 80 a 120 personas: cabina de DJ, pista, pantalla gigante e iluminación LED. Con hospedaje dentro del recinto.',
  espacios_recomendados  = '["eclipse", "salon-de-los-espejos"]'::jsonb,
  preguntas              = '[{"pregunta": "¿Qué es exactamente el Eclipse?", "respuesta": "Es como un night club, literal, dentro del recinto: hecho para música, para tomar algo y para tener una proyección. Tiene cabina de DJ, sistema de sonido, pista de baile amplia, proyector con pantalla gigante, iluminación LED tipo antro y área lounge con mesas y sillones."}, {"pregunta": "¿Para cuántas personas es?", "respuesta": "De 80 a 120. Si son más, el Salón Encanto va de 200 a 300 personas y el Salón de los Espejos de 100 a 400."}, {"pregunta": "¿Hay servicio de bebidas?", "respuesta": "Sí. El espacio tiene servicio de bebidas, y además hay bartender y bebidas preparadas."}, {"pregunta": "¿Y si el evento termina muy tarde?", "respuesta": "Adentro hay hospedaje, y sirve justamente para eso: para eventos que acaban tarde y para quien no tiene cómo regresarse. Son tres bungalows con salita, baño con regadera y un dormitorio con cama, y dos dormitorios completos de literas. Se cobra por noche."}, {"pregunta": "¿Se puede montar con una temática?", "respuesta": "Sí. La ambientación nocturna es personalizable y hay espacios para decoración temática. Además puedes sumar pista pixel LED, mega pantalla LED, cámara 360, set fotográfico, auto clásico o grupos musicales en vivo."}]'::jsonb
 where slug = 'nocturnos';

update jardines.salones set
  descripcion_larga = 'Hay gente que nos pregunta si damos shows de caballos o algo relacionado, por el logo y por el nombre. No los damos, y en esta área no hay ponis. Se llama así porque el lugar se llama Jardines Club Hípico y esta es la zona de los niños, no porque haya un animal esperando. Hoy ya no hay caballos en el recinto. Preferimos decírtelo aquí y no que un niño se lleve la decepción el día de la fiesta.

Lo que sí hay son juegos, y todos los que ves entran con la renta del área: trampolines, resbaladillas, estructuras de juego y tirolesa. Vienen con el espacio, igual que en los demás: todo lo que se ve anunciado dentro de un espacio entra con su renta.

Es un área al aire libre con patio amplio, pensada para que los niños corran, jueguen y hagan dinámicas sin estar encima de las mesas de los adultos. Aquí caben de 100 a 150 personas.

El recinto es cerrado y tiene nada más dos accesos, con seguridad adentro. Los niños salen al patio, pero el lugar es cerrado.

Si quieres más, las amenidades van aparte y tienen precio fijo: inflables infantiles, futbolito inflable, gladiador, aereobonji, cámara 360, alberca, mesa de dulces personalizada con la temática de la fiesta o un mago que sorprende a los invitados con trucos y magia de cerca.

La renta incluye lo mismo que en los demás espacios: mesas redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel. Y el horario es de seis horas en total con cinco activas, media hora para la entrada y media para la salida.',
  seo_title         = 'Área Infantil Pony: juegos incluidos, sin ponis',
  seo_description   = 'Área infantil al aire libre para 100 a 150 personas con trampolines, resbaladillas y tirolesa incluidos en la renta. Aviso honesto: no hay ponis.',
  datos_rapidos     = '[{"etiqueta": "Capacidad", "valor": "100 a 150 personas"}, {"etiqueta": "Ponis", "valor": "No hay. El nombre viene del club hípico"}, {"etiqueta": "Juegos", "valor": "Incluidos en la renta del área"}, {"etiqueta": "Qué incluye", "valor": "Trampolines, resbaladillas, estructuras de juego y tirolesa"}, {"etiqueta": "Entorno", "valor": "Patio amplio al aire libre, dentro del recinto cerrado"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿Hay ponis o caballos?", "respuesta": "Hay gente que nos pregunta si damos shows de caballos, por el nombre y por el logo. No los damos y no hay ponis. El área se llama así porque el lugar se llama Jardines Club Hípico y esta es la zona de los niños. Hoy ya no hay caballos en el recinto."}, {"pregunta": "¿Los juegos se pagan aparte?", "respuesta": "No. Todos los juegos que ves en el área entran con su renta: trampolines, resbaladillas, estructuras de juego y tirolesa."}, {"pregunta": "¿Los niños pueden andar sueltos?", "respuesta": "El recinto es cerrado, tiene nada más dos accesos y hay seguridad adentro. Los niños salen al patio, pero el lugar es cerrado."}, {"pregunta": "¿Puedo agregar inflables o un mago?", "respuesta": "Sí. Son amenidades que van aparte y tienen precio fijo: inflables infantiles, futbolito inflable, gladiador, aereobonji, cámara 360, alberca, mesa de dulces personalizada o un mago."}]'::jsonb
 where slug = 'area-infantil-pony';

update jardines.salones set
  descripcion_larga = 'La capilla está dentro del mismo recinto. Eso es lo que resuelve: la ceremonia y la fiesta pasan en el mismo terreno, sin que los invitados tengan que subirse al coche entre una cosa y otra. Caben de 50 a 150 personas.

Casi siempre las bodas de aquí llevan ceremonia en la capilla. Y se adapta a lo que tú quieras: puede ser católica o la que corresponda a tus creencias, según cómo la tengas pensada.

Es un espacio amplio y luminoso, con el frente pensado para el altar y adaptable para la decoración ceremonial. Sirve igual para bodas, XV años, bautizos y misas. Si te hace falta, te asesoramos con la decoración y la logística, que es un servicio y va aparte de la renta.

La puedes rentar de dos maneras. Junto con cualquiera de los salones, para hacer todo el mismo día en el mismo lugar; o sola, si lo único que quieres es la ceremonia y la reunión va a ser en otra parte.

Uno de los bungalows de las estancias se ofrece para que la novia se arregle aquí mismo, y lo mismo aplica para las quinceañeras. No tienes que llegar lista desde tu casa, cruzando la ciudad con el vestido puesto, ni buscar dónde cambiarte a media tarde.

Los jardines están en el mismo terreno y sirven de escenario para la sesión de fotos, sin traslados ni tiempos muertos entre la ceremonia y la recepción.

Si quieres conocerla antes de decidir, la visita es con cita previa, cuando menos con un día de anticipación y con hora acordada.',
  seo_title         = 'Capilla para bodas y XV años en Xochimilco',
  seo_description   = 'Capilla para 50 a 150 personas que se adapta a la ceremonia que tú quieras. Se renta sola o junto con cualquier salón, sin traslados entre sedes.',
  datos_rapidos     = '[{"etiqueta": "Capacidad", "valor": "50 a 150 personas"}, {"etiqueta": "Ceremonia", "valor": "Se adapta a lo que tú quieras"}, {"etiqueta": "Renta", "valor": "Sola o junto con cualquier salón"}, {"etiqueta": "Ubicación", "valor": "Dentro del mismo recinto, sin traslados"}, {"etiqueta": "Para la novia", "valor": "Un bungalow de las estancias para arreglarse"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿La ceremonia tiene que ser católica?", "respuesta": "No. La capilla se adapta a lo que tú quieras: puede ser católica o la que corresponda a tus creencias, según cómo la tengas pensada."}, {"pregunta": "¿Se puede rentar sola?", "respuesta": "Sí. Se renta sola, si solo quieres la ceremonia, o junto con cualquiera de los salones para hacer todo el mismo día en el mismo lugar."}, {"pregunta": "¿Dónde se arregla la novia?", "respuesta": "Se le ofrece uno de los bungalows de las estancias para que se arregle aquí mismo. Lo mismo aplica para las quinceañeras."}, {"pregunta": "¿Cuánta gente cabe?", "respuesta": "De 50 a 150 personas."}]'::jsonb
 where slug = 'capilla';

update jardines.salones set
  descripcion_larga = 'El Eclipse es, literal, un night club dentro del recinto. Está pensado para la parte de la noche: música, algo de tomar y proyección. Es un ambiente de noche. Caben de 80 a 120 personas.

Tiene cabina de DJ, sistema de sonido para música y presentaciones, pista de baile amplia, iluminación LED tipo antro y un proyector con pantalla gigante. Esa pantalla sirve para proyectar videos, mensajes o presentaciones. La ambientación se personaliza, así que el mismo espacio se siente distinto en una graduación, en un cumpleaños o en una reunión privada.

Hay área lounge, con mesas y sillones para los que prefieren sentarse a platicar sin gritar. Hay servicio de bebidas, y si quieres bartender y bebidas preparadas también se maneja.

La renta incluye el montaje básico: mesas, sillas Tiffany, mantel y cubremantel. El horario es de seis horas en total con cinco activas, media hora de entrada y media de salida. La hora extra existe y casi siempre se pide sobre la marcha, no antes; se cobra como un porcentaje del precio final, así que depende de tu cotización.

Dos cosas ayudan cuando el evento es de noche. La primera: el recinto es cerrado y tiene nada más dos accesos, con seguridad adentro. La segunda: si alguien no tiene cómo regresarse o el evento termina muy tarde, están las estancias, que se rentan por noche dentro del mismo terreno.

Funciona para cumpleaños, graduaciones, after parties, reuniones privadas y eventos temáticos, y tiene espacios pensados para decoración temática.',
  seo_title         = 'Eclipse: salón nocturno tipo night club en Xochimilco',
  seo_description   = 'Espacio nocturno para 80 a 120 personas con cabina de DJ, pista de baile, pantalla gigante e iluminación LED, dentro de Jardines Club Hípico.',
  datos_rapidos     = '[{"etiqueta": "Capacidad", "valor": "80 a 120 personas"}, {"etiqueta": "Ambiente", "valor": "Nocturno, tipo night club"}, {"etiqueta": "Equipo", "valor": "Cabina de DJ, sonido, proyector y pantalla gigante"}, {"etiqueta": "Extras", "valor": "Área lounge con mesas y sillones, y servicio de bebidas"}, {"etiqueta": "Horario", "valor": "6 horas en total, 5 activas"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿Qué tipo de evento va en el Eclipse?", "respuesta": "Es un espacio de noche, literal como un night club: música, algo de tomar y proyección. Se usa para cumpleaños, graduaciones, after parties, reuniones privadas y eventos temáticos."}, {"pregunta": "¿Puedo proyectar un video?", "respuesta": "Sí. Tiene proyector con pantalla gigante y sistema de sonido para música y presentaciones."}, {"pregunta": "¿Hay servicio de bebidas?", "respuesta": "Sí, hay servicio de bebidas, y también se maneja bartender y bebidas preparadas."}, {"pregunta": "¿Y si el evento termina muy tarde?", "respuesta": "Están las estancias, dentro del mismo terreno, que se rentan por noche. Sirven sobre todo para quien no tiene cómo regresarse a esa hora."}]'::jsonb
 where slug = 'eclipse';

update jardines.salones set
  descripcion_larga = 'Las estancias son el hospedaje dentro del recinto, y existen por una razón muy concreta: los eventos terminan tarde y no todos los invitados tienen cómo regresarse a esa hora. Se rentan por noche y están en el mismo terreno donde acaba de ser la fiesta.

Hay dos tipos y conviene saber cuál te sirve. Los bungalows son tres. Cada uno tiene salita, baño con regadera y un dormitorio con cama; es la opción para una pareja o para quien quiere privacidad después de la fiesta.

Los otros dos son dormitorios completos de literas, uno de hombres y otro de mujeres. Ahí no hay salita ni pretensión de suite: están hechos para que se quede mucha gente al mismo tiempo. Es lo que usan los grupos que vienen a retiros.

Uno de los bungalows se le ofrece a la novia para que se arregle aquí mismo, y lo mismo a la quinceañera. En vez de llegar lista desde tu casa, cruzando la ciudad con el vestido puesto, te preparas en el mismo terreno donde va a ser la ceremonia, con baño y regadera propios.

Están dentro del terreno, cerca de los jardines y del área del quiosco, así que quien se queda no tiene que salir del recinto en ningún momento, ni al terminar la fiesta ni a la mañana siguiente. Y el recinto es cerrado, con nada más dos accesos y seguridad adentro, lo cual importa cuando la gente se queda a dormir.

Los lugares son los que son: tres bungalows y dos dormitorios de literas, nada más.',
  seo_title         = 'Estancias: bungalows y dormitorios, por noche',
  seo_description   = 'Tres bungalows con salita, baño con regadera y cama, más dos dormitorios de literas. Se rentan por noche dentro del recinto, en Xochimilco.',
  datos_rapidos     = '[{"etiqueta": "Bungalows", "valor": "3, con salita, baño con regadera y dormitorio con cama"}, {"etiqueta": "Dormitorios de literas", "valor": "2, uno de hombres y uno de mujeres"}, {"etiqueta": "Renta", "valor": "Por noche"}, {"etiqueta": "Para la novia", "valor": "Uno de los bungalows, para que se arregle"}, {"etiqueta": "Retiros", "valor": "Los dormitorios de literas son para grupos grandes"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿Cuántos lugares hay para quedarse?", "respuesta": "Tres bungalows y dos dormitorios completos de literas. Son los que hay."}, {"pregunta": "¿Qué tiene un bungalow?", "respuesta": "Salita, baño con regadera y un dormitorio con cama."}, {"pregunta": "¿Para qué sirven los dormitorios de literas?", "respuesta": "Son dos, uno de hombres y otro de mujeres, y están hechos para que se quede mucha gente al mismo tiempo. Es lo que usan los grupos que vienen a retiros."}, {"pregunta": "¿La novia puede usar un bungalow para arreglarse?", "respuesta": "Sí. Uno de los bungalows se le ofrece a la novia para que se arregle aquí mismo, y lo mismo a la quinceañera."}, {"pregunta": "¿Cómo se renta el hospedaje?", "respuesta": "Por noche, dentro del mismo terreno donde fue el evento."}]'::jsonb
 where slug = 'estancias';

update jardines.salones set
  descripcion_larga = 'Los jardines son la parte abierta del terreno, que en total mide más de dos hectáreas, todas cerradas. Ahí caben con holgura de 400 a 600 invitados, que es el rango que recomendamos.

Para bodas es donde más se nota la decoración. Se arma un caminito, se pone alfombra y flores, y el pasillo queda montado sobre el pasto con los jardines de fondo. Es el mismo espacio que sirve para la ceremonia, para la recepción y para la sesión de fotos, sin mover a los invitados de sitio.

Como es al aire libre, hay que decir lo obvio: aquí no hay control del clima. Si te preocupa la lluvia se puede contratar una carpa, y es justo en los jardines donde más se pide. También se puede sumar una planta de luz, que funciona como seguro del evento: si se va la luz, la fiesta no se detiene.

El terreno da libertad para montar encima lo que quieras: pista de baile, escenario, zonas lounge, áreas de comida y estructuras temporales. La renta incluye el montaje básico, o sea mesas redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel, y el horario de seis horas en total con cinco activas, media hora de entrada y media de salida.

Lo que más le impone a la gente que llega es el tamaño y el verde: es un lugar muy grande, muy verde, con mucha naturaleza.

Y como todo pasa dentro del mismo recinto cerrado, que tiene solo dos accesos y seguridad adentro, no hay traslados entre una parte del evento y otra. Los niños corren por donde quieran sin salir de ningún lado.',
  seo_title         = 'Jardines para eventos al aire libre en Xochimilco',
  seo_description   = 'Áreas verdes para 400 a 600 invitados. Bodas con caminito, alfombra y flores; se puede contratar carpa y planta de luz. Todo en un recinto cerrado.',
  datos_rapidos     = '[{"etiqueta": "Capacidad recomendada", "valor": "400 a 600 personas"}, {"etiqueta": "Clima", "valor": "Al aire libre, sin control del clima; se puede contratar carpa"}, {"etiqueta": "Terreno", "valor": "Más de dos hectáreas, todo cerrado"}, {"etiqueta": "Montaje", "valor": "Mesas, sillas Tiffany, mantel y cubremantel"}, {"etiqueta": "Horario", "valor": "6 horas en total, 5 activas"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿Cuántas personas caben en los jardines?", "respuesta": "Recomendamos de 400 a 600 invitados, que es donde el montaje se ve mejor."}, {"pregunta": "¿Y si llueve?", "respuesta": "Al aire libre no hay control del clima. Si te preocupa, se puede contratar una carpa; es en los jardines donde más se pide."}, {"pregunta": "¿Cómo se decora una boda aquí?", "respuesta": "Se arma un caminito, se pone alfombra y flores, y el pasillo queda montado sobre el pasto con los jardines de fondo."}, {"pregunta": "¿Y si se va la luz?", "respuesta": "Se puede sumar una planta de luz. Funciona como seguro del evento: si se va la luz, la fiesta no se detiene."}]'::jsonb
 where slug = 'jardines';

update jardines.salones set
  descripcion_larga = 'El Quiosco es el espacio más íntimo del recinto. Está pensado para 30 a 50 personas, que es el tamaño de una comida familiar, de un cumpleaños sin pretensiones o de una reunión donde todos se conocen y nadie tiene que gritar para platicar.

Es una terraza techada con jardín propio y patio exclusivo, con vista hacia los jardines. Tiene una fuente decorativa y una parrilla, así que también funciona para una parrillada, si lo que quieres es algo más informal que un banquete montado. Al estar techado tienes sombra y protección sin encerrarte: la mesa sigue estando al aire libre y rodeada de verde.

La renta incluye el montaje básico, igual que en los demás espacios: mesas redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel. El horario es de seis horas en total, cinco de ellas activas, con media hora de entrada y media de salida.

Los alimentos se pueden contratar con nosotros. Las opciones son menú de tres tiempos, taquiza, barbacoa o buffet, y el buffet se maneja con servicio o sin servicio, o sea con meseros y atención a mesa o sin ellos. Según el tipo de evento también se puede traer comida de fuera; si no contratas los alimentos con nosotros, corren por tu cuenta.

Las estancias están dentro del mismo terreno, así que si la reunión se alarga o alguien viene de lejos hay dónde quedarse a dormir; se rentan por noche.

Y aunque sea el espacio chico, comparte lo demás con el resto del recinto: sanitarios, seguridad y más de dos hectáreas cerradas con solo dos accesos.

Sirve para reuniones familiares, cumpleaños, comidas especiales y convivencias chicas. Y si quieres conocerlo antes de decidir, la visita es con cita previa, con un día de anticipación cuando menos y con hora acordada.',
  seo_title         = 'Quiosco: el espacio más íntimo del recinto',
  seo_description   = 'Terraza techada con jardín privado, parrilla y fuente para 30 a 50 personas. El espacio más íntimo de Jardines Club Hípico, en Xochimilco.',
  datos_rapidos     = '[{"etiqueta": "Capacidad", "valor": "30 a 50 personas"}, {"etiqueta": "Techado", "valor": "Terraza techada, con jardín propio y patio exclusivo"}, {"etiqueta": "Extras", "valor": "Parrilla y fuente decorativa"}, {"etiqueta": "Montaje", "valor": "Mesas, sillas Tiffany, mantel y cubremantel"}, {"etiqueta": "Horario", "valor": "6 horas en total, 5 activas"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿Cuál es el espacio más chico del recinto?", "respuesta": "El Quiosco. Está pensado para 30 a 50 personas y es el más íntimo de todos."}, {"pregunta": "¿Puedo hacer una parrillada?", "respuesta": "Sí. El Quiosco tiene parrilla, además de jardín propio, patio exclusivo y una fuente decorativa."}, {"pregunta": "¿Puedo traer mi propia comida?", "respuesta": "Según el tipo de evento se puede; si no contratas los alimentos con nosotros, corren por tu cuenta. También puedes contratarlos aquí: menú de tres tiempos, taquiza, barbacoa o buffet, con servicio o sin servicio."}, {"pregunta": "¿Está techado?", "respuesta": "Es una terraza techada con jardín propio y patio exclusivo, así que tienes sombra y protección sin dejar de estar al aire libre."}]'::jsonb
 where slug = 'quiosco';

update jardines.salones set
  descripcion_larga = 'El Salón de los Espejos es el salón principal de Jardines Club Hípico y es donde se hacen las bodas más formales. Es un salón cubierto, para 100 a 400 personas: si el día de tu evento llueve, adentro no pasa nada.

Al rentarlo entra también el Campo Grande, y no es un extra que haya que negociar aparte: viene con el salón. Ese campo era el de los jinetes avanzados cuando esto todavía era un club ecuestre. Hoy ya no hay caballos en el recinto.

Adentro hay pista de baile amplia y escenario, así que un grupo en vivo, un cantante o una presentación caben sin tener que improvisar nada. La iluminación es ambiental y se ajusta al momento de la fiesta. También tiene cocina equipada dentro del mismo salón, barra de bar para el servicio de bebidas, baños amplios, patio exterior, una zona pensada para la sesión de fotos y un área recreativa infantil con alberca de pelotas.

La renta incluye el montaje básico: mesas, que eliges redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel. Elegir otro modelo de silla sube el costo. El horario son seis horas en total, de las cuales cinco son activas: media hora se va en la entrada y media hora en la salida.

Para eventos de empresa este mismo salón se monta como sala de conferencias. Te podemos dar proyector, pantalla, sillas y WiFi, que son servicios y van aparte de la renta del espacio; o si tu equipo trae su propio material, rentas nada más el salón.

Y lo demás que necesita tu evento está en el mismo terreno: la capilla para la ceremonia, los jardines, el área infantil y las estancias para quien se quede a dormir. No hay traslados de por medio, y el recinto es cerrado, con solo dos accesos y seguridad adentro.',
  seo_title         = 'Salón de los Espejos | Jardines Club Hípico',
  seo_description   = 'Salón principal cubierto para 100 a 400 personas. La renta incluye el Campo Grande, sillas Tiffany y montaje. Bodas, XV años y eventos de empresa.',
  datos_rapidos     = '[{"etiqueta": "Capacidad", "valor": "100 a 400 personas"}, {"etiqueta": "Techado", "valor": "Sí, es un salón cubierto"}, {"etiqueta": "Incluye", "valor": "El Campo Grande"}, {"etiqueta": "Montaje", "valor": "Mesas, sillas Tiffany, mantel y cubremantel"}, {"etiqueta": "Horario", "valor": "6 horas en total, 5 activas"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿Qué pasa si llueve el día de mi evento?", "respuesta": "Nada. El Salón de los Espejos es un salón cubierto, así que la fiesta sigue adentro tal como estaba planeada."}, {"pregunta": "¿El Campo Grande se renta aparte?", "respuesta": "No. El Campo Grande entra con la renta del Salón de los Espejos. Era el campo de los avanzados cuando esto era un club ecuestre."}, {"pregunta": "¿Sirve para un evento de empresa?", "respuesta": "Sí. Este mismo salón se monta como sala de conferencias. Te podemos dar proyector, pantalla, sillas y WiFi, que van aparte de la renta del espacio; o si tu equipo trae su propio material, rentas nada más el salón."}, {"pregunta": "¿Cuántas horas dura la renta?", "respuesta": "Seis horas en total, de las cuales cinco son activas: media hora se usa para la entrada y media para la salida. La hora extra existe, casi siempre se pide sobre la marcha y se cobra como un porcentaje del precio final."}, {"pregunta": "¿Por qué no hay precios en la página?", "respuesta": "Porque la renta del espacio y la comida se cobran por persona, así que el costo depende de cuántos sean; un número suelto sería falso para casi todo el mundo. Las amenidades y los servicios van aparte y tienen precio fijo. El número se arma en la cotización, después de la visita."}]'::jsonb
 where slug = 'salon-de-los-espejos';

update jardines.salones set
  descripcion_larga = 'El Salón Encanto gusta por su temática de trajinera. Estamos en Xochimilco. Caben de 200 a 300 personas.

Es un salón techado y abierto hacia los jardines. De día entra luz natural y tienes el verde a la vista; de noche cambia por completo con la iluminación ambiental y la pista de baile iluminada. Tiene área para DJ o para música en vivo, y el montaje se acomoda al estilo que traigas, sea temático o tradicional. Si llueve, cuenta con carpa.

Con la renta del Encanto entra el Campo del Encanto, que tiene juegos. Eso resuelve la parte de los niños cuando la fiesta es larga: tienen dónde estar sin quedarse sentados en la mesa. Ese campo era el de los principiantes en la época del club ecuestre.

Aquí estaba el picadero: un corral redondo, con un tubo al centro y una cuerda, donde se trabajaba al caballo dándole vueltas en círculo. Hoy ya no hay caballos en el lugar.

La renta incluye el montaje básico: mesas redondas, cuadradas o rectangulares, sillas Tiffany, mantel y cubremantel. Elegir otro modelo de silla sube el costo. El horario es de seis horas en total con cinco activas, contando media hora de entrada y media de salida.

También funciona para eventos de empresa. Se monta como sala de conferencias y te podemos dar proyector, pantalla, sillas y WiFi, que van aparte de la renta del espacio; o rentas nada más el salón y traes tu propio equipo.

Y como todo está dentro del mismo recinto cerrado, con solo dos accesos y seguridad adentro, no hay traslados entre la ceremonia, la comida y la fiesta. La capilla está aquí mismo y se puede sumar a la renta del salón.',
  seo_title         = 'Salón Encanto: temática de trajinera en Xochimilco',
  seo_description   = 'Salón techado para 200 a 300 personas con temática de trajinera. Incluye el Campo del Encanto con juegos, sillas Tiffany y montaje básico.',
  datos_rapidos     = '[{"etiqueta": "Capacidad", "valor": "200 a 300 personas"}, {"etiqueta": "Temática", "valor": "Trajinera de Xochimilco"}, {"etiqueta": "Incluye", "valor": "El Campo del Encanto, que tiene juegos"}, {"etiqueta": "Si llueve", "valor": "Salón techado y con carpa"}, {"etiqueta": "Horario", "valor": "6 horas en total, 5 activas"}]'::jsonb,
  preguntas         = '[{"pregunta": "¿Por qué la temática de trajinera?", "respuesta": "Porque estamos en Xochimilco. Es la temática del salón y es lo que gusta de él."}, {"pregunta": "¿El Campo del Encanto entra con la renta?", "respuesta": "Sí, entra con el salón y tiene juegos, así que los niños tienen dónde estar cuando la fiesta es larga."}, {"pregunta": "¿Qué pasa si llueve?", "respuesta": "El salón es techado y además cuenta con carpa."}, {"pregunta": "¿Aquí había caballos?", "respuesta": "Aquí estaba el picadero del club ecuestre: un corral redondo, con un tubo al centro y una cuerda, donde se trabajaba al caballo en círculos. Hoy ya no hay caballos en el lugar."}]'::jsonb
 where slug = 'salon-encanto';
