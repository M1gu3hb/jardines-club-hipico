/**
 * Las condiciones de contratación, publicadas.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DE DÓNDE SALE CADA LÍNEA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * De la entrevista con el dueño (`rediseño-sitio-web/14-RESPUESTAS-NEGOCIO.md`), y de ningún
 * otro sitio. **Ni una condición está inventada ni «rellenada» con lo que suele hacer el
 * sector**: una condición inventada que luego no se cumple es peor que no tener condiciones,
 * porque el cliente la leyó y se la creyó.
 *
 * Él lo pidió así: *«pon algo de reglas, cosas que nos protejan»*.
 *
 * ── Por qué publicarlas PROTEGE de verdad ───────────────────────────────────
 *
 * Porque una condición que el cliente no supo hasta el día del contrato es una discusión
 * garantizada, y la discusión la pierde siempre quien la comunicó tarde. «El anticipo no es
 * reembolsable» escrito en la web ANTES de que nadie pague vale más que la misma frase en la
 * cláusula nueve de un papel que se firma con prisa.
 *
 * Y hace un segundo trabajo: **filtra**. Quien no acepta pagar una semana antes se descarta
 * solo, y eso ahorra reuniones que no iban a ningún lado.
 *
 * ── La regla del dinero sigue en pie ────────────────────────────────────────
 *
 * Ni una cifra. Se explica CÓMO se cobra —que el dueño quiso que se explicara— y nunca CUÁNTO.
 * «Un porcentaje del precio final» describe el mecanismo sin publicar un número.
 *
 * ── Lo que falta, y por qué no está ─────────────────────────────────────────
 *
 * **La política de cancelación.** Sus palabras: *«eso ya al momento del contrato, yo
 * prefiero»*. Así que aquí solo se dice que se acuerda en el contrato. Escribir plazos o
 * penalizaciones que él no ha fijado sería inventarle una política.
 */

export const CONDICIONES = [
  {
    id: 'horario',
    titulo: 'El horario del evento',
    texto:
      'Son seis horas en total: media hora de entrada, cinco horas activas y media hora de ' +
      'salida. La media hora de cada extremo es para que el montaje y la recogida no se ' +
      'coman tu fiesta.',
  },
  {
    id: 'hora-extra',
    titulo: 'Si el evento se alarga',
    texto:
      'Hay hora extra y casi siempre se pide sobre la marcha, no antes. Se cobra como un ' +
      'porcentaje del precio final de tu evento, así que el monto depende de lo que hayas ' +
      'contratado. Se te dice en el momento, nunca después.',
  },
  {
    id: 'apartar',
    titulo: 'Cómo se aparta tu fecha',
    texto:
      'La fecha queda apartada en el momento en que hay un anticipo, y no antes. No pedimos ' +
      'un monto fijo: con lo que puedas, dentro de lo razonable. Mientras no haya anticipo, ' +
      'esa fecha sigue disponible para quien la pida — el lugar también lo rentan otros ' +
      'socios y no podemos reservarla de palabra.',
  },
  {
    id: 'anticipo',
    titulo: 'El anticipo no se devuelve',
    texto:
      'Lo decimos aquí y no en la última página de un contrato, para que lo sepas antes de ' +
      'pagar nada. Al apartar tu fecha dejamos de ofrecerla a nadie más, y ese es el motivo ' +
      'de la regla.',
    subrayado: true,
  },
  {
    id: 'pagos',
    titulo: 'Las formas de pago',
    texto:
      'Transferencia o efectivo. No manejamos tarjeta: no tenemos terminal. El plan de pagos ' +
      'se arma contigo y somos flexibles con las fechas.',
  },
  {
    id: 'liquidacion',
    titulo: 'Todo liquidado una semana antes',
    texto:
      'Esta sí es innegociable. Una semana antes del evento el saldo tiene que estar cubierto, ' +
      'porque a partir de ahí se compra, se contrata y se monta.',
    subrayado: true,
  },
  {
    id: 'cancelacion',
    titulo: 'Cancelaciones y cambios de fecha',
    texto:
      'Se acuerdan contigo al momento del contrato, viendo tu caso. Si te preocupa algo en ' +
      'concreto, pregúntalo antes de apartar: preferimos hablarlo de frente.',
  },
];
