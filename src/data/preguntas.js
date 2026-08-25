/**
 * preguntas.js — las preguntas frecuentes, agrupadas por tema.
 *
 * ── Por qué salen de `FaqSection.jsx` ───────────────────────────────────────
 *
 * Estaban escritas dentro del componente que las pintaba en la portada. Ahora las necesitan
 * dos sitios: el resumen de la Home y la página `/preguntas-frecuentes`. Copiarlas habría
 * garantizado que en unos meses las dos versiones dijeran cosas distintas, y la que se
 * quedara vieja sería la que Google indexara.
 *
 * ── El `tema` no es adorno ──────────────────────────────────────────────────
 *
 * Sirve para dos cosas: agrupar el índice, y poder llevar cada pregunta a la página donde de
 * verdad importa. La duda sobre estacionamiento vale mucho más dentro de `/amenidades`, y la
 * de capacidad dentro de la ficha del espacio, que enterradas en una lista de veinte.
 *
 * ── Advertencia ─────────────────────────────────────────────────────────────
 *
 * **Son solo ocho.** Repartidas entre veinte páginas no llegan ni a una por página. Hacen
 * falta más, y salen de las preguntas que el dueño recibe por WhatsApp todos los días — que
 * es la mejor fuente posible y la única honesta. Aquí no se inventa ninguna: una respuesta
 * inventada sobre horarios o descorche se la reclaman a él por teléfono, no a este archivo.
 *
 * Están pedidas en `rediseño-sitio-web/13-ENTREVISTA.md`.
 */

export const TEMAS = {
  ESPACIOS: 'Espacios y capacidad',
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
    tema: TEMAS.ESPACIOS,
    q: '¿Hay un mínimo de personas para rentar?',
    // Respuesta del dueño, textual, el 2026-08-24. No es una política inventada: es
    // exactamente lo que hace el negocio, y decirlo por escrito evita que alguien con un
    // grupo pequeño se descarte solo antes de escribir.
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
    a: 'Sí, contamos con estacionamiento amplio y acceso cómodo para tus invitados.',
  },
  {
    tema: TEMAS.RECINTO,
    q: '¿Tienen hospedaje?',
    a: 'Sí. Dentro del complejo tenemos bungalos (estancias) para que tú y tus invitados puedan descansar después del evento, sin necesidad de trasladarse.',
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
    a: 'No manejamos paquetes fijos: armamos cada evento a tu medida. Tú nos cuentas cómo lo imaginas y nosotros lo cubrimos todo por piezas — desde el espacio (lo primordial) hasta alimentos, bebidas, DJ o música en vivo, meseros, decoración, mobiliario y cualquier detalle que necesites. Cada servicio tiene su costo y se cotiza según tu evento, así pagas justo lo que necesitas.',
  },
  {
    tema: TEMAS.CONTRATAR,
    q: '¿Cómo aparto mi fecha?',
    a: 'Llena el formulario de cotización (te toma menos de 1 minuto) y nos ponemos en contacto contigo por WhatsApp para revisar disponibilidad y afinar todos los detalles de tu evento.',
  },
];

/** Las que se enseñan en la portada: las que más se preguntan, no todas. */
export const PREGUNTAS_DESTACADAS = PREGUNTAS.filter((p) =>
  [
    '¿Para cuántas personas son los espacios?',
    '¿Hay un mínimo de personas para rentar?',
    '¿Manejan paquetes o cotizan por separado?',
    '¿Tienen hospedaje?',
    '¿Cómo aparto mi fecha?',
  ].includes(p.q),
);

/** Agrupadas por tema, respetando el orden de declaración de `TEMAS`. */
export const porTema = () =>
  Object.values(TEMAS)
    .map((tema) => ({ tema, items: PREGUNTAS.filter((p) => p.tema === tema) }))
    .filter((g) => g.items.length > 0);
