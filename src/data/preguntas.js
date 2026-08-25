/**
 * preguntas.js — las preguntas frecuentes, agrupadas por tema.
 *
 * ── De dónde salen ──────────────────────────────────────────────────────────
 *
 * Ocho estaban escritas dentro de `FaqSection.jsx`, que es donde nacieron cuando el sitio era
 * una sola página. Las demás salen de la entrevista al dueño
 * (`rediseño-sitio-web/14-RESPUESTAS-NEGOCIO.md`) y **casi ninguna existía antes en el sitio**:
 * cuánto dura un evento, si hace falta cita, cuánto es el anticipo, si aceptan tarjeta, qué
 * pasa si llueve. Todo eso se preguntaba por WhatsApp, una y otra vez.
 *
 * ── Por qué viven aquí y no dentro del componente ───────────────────────────
 *
 * Porque las necesitan dos sitios: el resumen de la portada y la página
 * `/preguntas-frecuentes`. Dos copias del mismo texto acaban SIEMPRE diciendo cosas distintas,
 * y la que se quede vieja será la que Google indexe.
 *
 * Las preguntas de un espacio concreto NO están aquí: viven en `jardines.salones.preguntas`,
 * y las de un tipo de evento en `jardines.tipos_evento.preguntas`. Ahí las puede editar el
 * dueño desde el panel, que es donde tiene sentido que las edite.
 *
 * ── Aquí no se inventa ninguna ──────────────────────────────────────────────
 *
 * Una respuesta inventada sobre horarios, anticipos o descorche se la reclaman al dueño por
 * teléfono, no a este archivo. Lo que falta se queda sin escribir y se pregunta.
 */

export const TEMAS = {
  ESPACIOS: 'Espacios y capacidad',
  INCLUIDO: 'Qué incluye la renta',
  ALIMENTOS: 'Alimentos y bebidas',
  CONTRATAR: 'Cómo se contrata',
  RECINTO: 'El recinto',
  EVENTOS: 'Tipos de evento',
};

export const PREGUNTAS = [
  {
    tema: TEMAS.ESPACIOS,
    q: '¿Para cuántas personas son los espacios?',
    a: 'Tenemos espacios desde 30 hasta 600 personas. Según el tamaño y tipo de tu evento te recomendamos el ideal — hemos realizado todo tipo de eventos en todos nuestros espacios.',
  },
  {
    // Respuesta del dueño, textual, el 2026-08-24. No es una política inventada: es exactamente lo que hace el negocio, y decirlo por escrito evita que alguien con un grupo pequeño se descarte solo antes de escribir.
    tema: TEMAS.ESPACIOS,
    q: '¿Hay un mínimo de personas para rentar?',
    a: 'No. El número mínimo que ves en cada espacio es una recomendación para que el salón no se vea vacío, no un requisito. Hemos hecho eventos de 40 y 50 personas en salones grandes: el montaje se ajusta con salas lounge y sillones para que el espacio se sienta lleno.',
  },
  {
    tema: TEMAS.ESPACIOS,
    q: '¿Tienen capilla para la ceremonia?',
    a: 'Sí, contamos con una capilla propia. Puedes realizar la ceremonia y la recepción en el mismo lugar, o rentarla de forma independiente.',
  },
  {
    tema: TEMAS.RECINTO,
    q: '¿Cuentan con estacionamiento?',
    a: 'Sí, contamos con estacionamiento amplio y acceso cómodo para tus invitados, dentro del recinto.',
  },
  {
    tema: TEMAS.RECINTO,
    q: '¿Tienen hospedaje?',
    a: 'Sí. Dentro del complejo hay tres bungalows —con salita, baño con regadera y un dormitorio con cama— y dos dormitorios completos de literas, uno de hombres y uno de mujeres. Se cobran por noche.',
  },
  {
    tema: TEMAS.RECINTO,
    q: '¿Dónde están ubicados?',
    a: 'En Santa Inés, Xochimilco, al sur de la Ciudad de México. Puedes ver el mapa y las referencias para llegar en la página de ubicación.',
  },
  {
    tema: TEMAS.EVENTOS,
    q: '¿Qué tipo de eventos realizan?',
    a: 'Bodas, XV años, cumpleaños, eventos infantiles, corporativos y celebraciones nocturnas. Cada espacio se adapta a lo que necesites.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Manejan paquetes o cotizan por separado?',
    a: 'No manejamos paquetes fijos: armamos cada evento a tu medida. Tú nos cuentas cómo lo imaginas y nosotros lo cubrimos todo por piezas — desde el espacio (lo primordial) hasta alimentos, bebidas, DJ o música en vivo, meseros, decoración, mobiliario y cualquier detalle que necesites.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Cómo aparto mi fecha?',
    a: 'Primero ven a conocer el lugar: la visita se agenda con al menos un día de anticipación, con fecha y hora. La fecha queda apartada en el momento en que entra un anticipo. De ahí se arma un plan de pagos y, una semana antes del evento, todo tiene que quedar liquidado.',
  },
  {
    tema: TEMAS.INCLUIDO,
    q: '¿Las mesas y las sillas van incluidas?',
    a: 'Sí. Eliges las mesas entre redondas, cuadradas o rectangulares, y las sillas incluidas son Tiffany. También entran mantel y cubremantel. Si prefieres otro modelo de silla se puede, pero sube el costo.',
  },
  {
    tema: TEMAS.INCLUIDO,
    q: '¿Cuántas horas dura la renta?',
    a: 'Seis horas en total, de las cuales cinco son activas: media hora se va en la entrada y media en la salida. La hora extra existe y casi siempre se pide sobre la marcha; se cobra como un porcentaje del precio final, así que depende de la cotización.',
  },
  {
    tema: TEMAS.INCLUIDO,
    q: '¿El campo y los juegos entran con el salón?',
    a: 'Según el espacio. El Salón de los Espejos trae el Campo Grande. El Salón Encanto trae el Campo del Encanto, que además tiene juegos. Y el Área Infantil Pony viene con los juegos que tiene, sin rentarlos por separado.',
  },
  {
    tema: TEMAS.INCLUIDO,
    q: '¿Cuánto dura el evento?',
    a: 'Seis horas en total, de las cuales cinco son horas activas. La hora restante se reparte en media hora de entrada y media hora de salida.',
  },
  {
    tema: TEMAS.INCLUIDO,
    q: '¿Puedo contratar horas extra?',
    a: 'Sí, la hora extra existe. Casi siempre se pide sobre la marcha, no antes. Se cobra como un porcentaje del precio final de tu evento, así que el monto depende de lo que hayas contratado y se calcula sobre tu cotización.',
  },
  {
    tema: TEMAS.ALIMENTOS,
    q: '¿Puedo llevar comida de fuera?',
    a: 'Sí se puede, y depende del evento. Si no contratas los alimentos con el recinto, esa parte corre por tu cuenta. Dilo desde la visita, porque cambia cómo se monta el evento.',
  },
  {
    tema: TEMAS.ALIMENTOS,
    q: '¿Qué diferencia hay entre un servicio formal y uno informal?',
    a: 'Que haya servicio o no lo haya. Servicio quiere decir meseros y atención a mesa. Se maneja sobre todo en el buffet.',
  },
  {
    tema: TEMAS.ALIMENTOS,
    q: '¿Puedo ver los menús aquí en la página?',
    a: 'Todavía no. Los menús los ponen los proveedores con los que trabajamos y preferimos no publicar platillos que después no se sostengan.',
  },
  {
    tema: TEMAS.ALIMENTOS,
    q: '¿Hay bar y bebidas preparadas?',
    a: 'Sí. Hay bebidas, hay bartender y se manejan bebidas preparadas. El Salón de los Espejos tiene además su propia barra de bar y cocina equipada dentro del salón.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Por qué no hay precios en la página?',
    a: 'Porque se cobra por persona: la renta del espacio y la comida se calculan por invitado, y las amenidades y los servicios van aparte con precio fijo. El costo depende de cuántos sean, así que un número suelto no diría la verdad para casi nadie. Se cotiza en persona, en la visita.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Necesito cita para conocer el lugar?',
    a: 'Sí. La visita es con cita previa, con mínimo un día de anticipación y con hora establecida. El mismo día no se puede. Pedimos la hora y no solo la fecha porque tenemos otras cosas que hacer.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Cuánto tengo que dar de anticipo para apartar mi fecha?',
    a: 'No hay un monto fijo. Es con lo que puedas, dentro de lo razonable. La fecha queda confirmada en el momento en que entra el anticipo, no por cuánto fue.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Por qué no me pueden apartar la fecha sin anticipo?',
    a: 'Porque aquí hay socios que también rentan el lugar. Mientras no haya dinero de por medio, esa fecha sigue libre para cualquiera de ellos y para cualquier otro cliente. En cuanto entra el anticipo, esa fecha se aparta.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Puedo pagar en abonos?',
    a: 'Sí. Los pagos son muy flexibles y se arma un plan de pagos; tampoco nos gusta andar correteando a nadie. Lo único innegociable es que una semana antes del evento todo tiene que estar liquidado.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Aceptan tarjeta?',
    a: 'No, no tenemos terminal. Se paga por transferencia o en efectivo.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Con quién voy a tratar cuando mande mi solicitud?',
    a: 'Con el dueño. Él lee y contesta personalmente las solicitudes, por WhatsApp. No hay un centro de llamadas de por medio.',
  },
  {
    tema: TEMAS.RECINTO,
    q: '¿Qué pasa si llueve?',
    a: 'Depende del espacio. El Salón de los Espejos es cerrado, así que no pasa nada. El Salón Encanto es techado y además cuenta con carpa. En los Jardines no hay control del clima, pero se puede contratar carpa.',
  },
];

/** Las que se enseñan en la portada: las que más se preguntan, no todas. */
const EN_LA_PORTADA = [
  '¿Para cuántas personas son los espacios?',
  '¿Hay un mínimo de personas para rentar?',
  '¿Cuánto dura el evento?',
  '¿Por qué no hay precios en la página?',
  '¿Necesito cita para conocer el lugar?',
  '¿Cómo aparto mi fecha?',
];

export const PREGUNTAS_DESTACADAS = EN_LA_PORTADA
  .map((q) => PREGUNTAS.find((p) => p.q === q))
  .filter(Boolean);

/** Agrupadas por tema, respetando el orden de declaración de `TEMAS`. */
export const porTema = () =>
  Object.values(TEMAS)
    .map((tema) => ({ tema, items: PREGUNTAS.filter((p) => p.tema === tema) }))
    .filter((g) => g.items.length > 0);
