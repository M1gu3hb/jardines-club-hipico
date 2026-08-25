/**
 * textos-como-funciona.js — la prosa de `/como-funciona`.
 *
 * Todo esto sale de la entrevista al dueño (`rediseño-sitio-web/14-RESPUESTAS-NEGOCIO.md`) y
 * **casi nada de ello existía antes en el sitio**: ni el horario, ni cómo se aparta una fecha,
 * ni cómo se paga, ni qué pasa si llueve. Eran cinco conversaciones de WhatsApp al día que
 * ahora contesta la página.
 *
 * ── La regla que gobierna estos textos ──────────────────────────────────────
 *
 * **Una regla con motivo se acepta; una regla sin motivo molesta.** Por eso el bloque de
 * apartar no dice solo «hace falta anticipo»: dice POR QUÉ —hay socios que también rentan el
 * lugar, así que sin dinero de por medio la fecha sigue libre—. Es la diferencia entre sonar
 * arbitrario y sonar razonable, y la información es la misma.
 *
 * ── Lo que NO está aquí ─────────────────────────────────────────────────────
 *
 * La política de cancelación, y no es un olvido: el dueño dijo expresamente que eso es del
 * contrato, no de la página. Tampoco si el anticipo se devuelve, por lo mismo. Y ninguna
 * cifra de dinero.
 */

export const INTRO = `Aquí no hay paquetes cerrados ni un botón de reservar. Un evento se arma pieza por pieza y se cierra hablando con nosotros, así que esta página cuenta cómo funciona de verdad: cuánto dura, cómo se conoce el lugar, cómo se aparta una fecha, cómo se paga, qué pasa si llueve y quién te contesta del otro lado.

Lo que no vas a encontrar aquí es un precio: el espacio y la comida se cobran por persona, así que el número depende de cuántos sean. Eso se ve en la cotización, no en una página.`;

export const HORARIO = `El evento dura seis horas en total y cinco de ellas son horas activas. La hora que queda se reparte en dos: media hora de entrada y media hora de salida. Así se maneja siempre.

El montaje básico va incluido: mesa, sillas, mantel y cubremantel. Las mesas las eliges tú —redondas, cuadradas o rectangulares— y las sillas Tiffany vienen incluidas; si prefieres otro modelo de silla, ese cambio sube el costo. Del montaje antes del evento y del desmontaje al terminar nos encargamos nosotros.

Sí hay hora extra. Lo que pasa en la práctica es que casi siempre se pide sobre la marcha, no antes. Se cobra como un porcentaje del precio final de tu evento, así que cuánto es depende de lo que hayas contratado, y se calcula sobre tu cotización.`;

export const LA_VISITA = `De todo lo que hay en esta página, esto es en lo que más insistimos: ven a conocer el lugar antes de decidir. Son más de dos hectáreas y todo está cerrado; en fotos no se alcanza a dimensionar. La gente que llega se queda atónita: es muy grande, muy verde, mucha naturaleza.

En la visita recorres el lugar, ves con tus ojos en cuál espacio caben tus invitados y preguntas lo que quieras en el momento.`;

/** Las dos condiciones de la visita van aparte: son reglas, no prosa, y se leen mejor en lista. */
export const CONDICIONES_VISITA = [
  {
    titulo: 'Con cita previa y mínimo un día de anticipación',
    texto: 'El mismo día no se puede.',
  },
  {
    titulo: 'Con hora establecida',
    texto: 'No basta con la fecha; necesitamos saber a qué hora, porque tenemos otras cosas que hacer.',
  },
];

export const APARTAR = `Tu fecha queda apartada en el momento en que entra el anticipo. Antes de eso no está apartada, aunque ya hayamos hablado, aunque hayas venido a verla y aunque te hayamos dicho que estaba libre.

El motivo es concreto y es mejor que lo sepas: aquí hay socios que también rentan el lugar. Mientras no haya dinero de por medio, esa fecha sigue libre para cualquiera de ellos y para cualquier otro cliente. No es una forma de apurarte, es cómo está organizado el lugar.

No hay un monto fijo. Es con lo que puedas, dentro de lo razonable. Lo que confirma la fecha es que haya entrado un anticipo, no cuánto fue.`;

export const PAGOS = `Antes de hablar de pagos conviene entender de dónde sale el número. El espacio y la comida se cobran por persona; las amenidades y los servicios tienen precio fijo y se suman aparte. Por eso no verás una cifra en esta página: el mismo salón no cuesta lo mismo con pocos invitados que con muchos. Tu precio sale de tu cotización.

Ya con la cotización en la mano, los pagos son muy flexibles: se arma un plan de pagos. Tampoco nos gusta andar correteando a nadie.

Hay una sola fecha que no se mueve: una semana antes del evento todo tiene que estar liquidado. Eso sí es innegociable, y preferimos decírtelo desde ahora y no esa misma semana.

Se paga por transferencia o en efectivo. Tarjeta no: no tenemos terminal.`;

/** Si llueve, la respuesta depende del espacio. En tabla se compara de un vistazo. */
export const SI_LLUEVE = [
  {
    espacio: 'Salón de los Espejos',
    respuesta: 'Es un salón cerrado. Llueva lo que llueva, adentro el evento sigue igual.',
    a: '/espacios/salon-de-los-espejos',
  },
  {
    espacio: 'Salón Encanto',
    respuesta: 'Es una estructura techada y además cuenta con carpa. También queda cubierto.',
    a: '/espacios/salon-encanto',
  },
  {
    espacio: 'Los Jardines',
    respuesta:
      'Aquí no hay control del clima. Lo que sí se puede es contratar carpa, y es sobre todo en los jardines donde se contrata.',
    a: '/espacios/jardines',
  },
];

export const PLANTA_DE_LUZ =
  'La planta de luz es opcional, pero siempre intentamos incluirla. Es un seguro para el evento, literal: que se vaya la luz o que pase algo.';

export const QUIEN_ATIENDE = `Tu solicitud no cae en un buzón compartido ni en un centro de llamadas. La lee y la contesta el dueño, personalmente y por WhatsApp.

Es un negocio familiar: la familia Huerta. Lo empezaron los abuelos del dueño, su papá dio clases de equitación aquí durante muchos años, y hoy lo operan su papá y él. El 90 % de nuestros clientes llega de boca en boca.`;
