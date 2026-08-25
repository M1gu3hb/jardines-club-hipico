/**
 * textos-servicios.js — la prosa de `/servicios`.
 *
 * ── Por qué vive en un archivo y no en la base ──────────────────────────────
 *
 * Porque no es una ficha: es la explicación de cómo funciona el negocio. Las tablas de la base
 * guardan COSAS —un servicio, una amenidad, un menú— y cada fila tiene su título y su
 * descripción. Esto es otra cosa: cuatro bloques de texto que dan el marco donde esas filas
 * tienen sentido.
 *
 * Meterlo en la base obligaría a inventar una tabla de «bloques de texto de páginas», que es
 * el camino corto hacia un gestor de contenidos entero. Y este texto cambia cuando cambia el
 * NEGOCIO —los horarios, lo que incluye la renta, cómo se cobra—, no cada semana.
 *
 * ── De dónde salió cada frase ───────────────────────────────────────────────
 *
 * De la entrevista al dueño, en `rediseño-sitio-web/14-RESPUESTAS-NEGOCIO.md`. Pasó por una
 * verificación adversaria que cazó 80 afirmaciones sin respaldo en la primera versión, y por
 * una segunda ronda. **Si algo de aquí contradice ese documento, lo que está mal es esto.**
 *
 * ── Lo que deliberadamente NO dice ──────────────────────────────────────────
 *
 * Ni una cifra de dinero. Nada sobre la política de cancelación ni sobre si el anticipo se
 * devuelve — el dueño dijo que eso es del contrato. Y ningún platillo concreto: los menús de
 * los proveedores todavía no están, y publicar una carta que después no se sostenga es peor
 * que no publicar ninguna.
 */

export const QUE_INCLUYE = `Rentar un espacio incluye el espacio con todo lo que se anuncia en él. Si en su ficha aparece la pista de baile, el escenario, el patio o el área de juegos, eso viene con la renta.

Del mobiliario entran las mesas, y las eliges tú: redondas, cuadradas o rectangulares. Las sillas incluidas son Tiffany; puedes pedir otro modelo, pero eso sube el costo. Entran también el mantel y el cubremantel. El montaje básico es literalmente eso: mesa, sillas, mantel y listo.

Hay espacios que traen más que el área techada. El Salón de los Espejos trae el Campo Grande. El Salón Encanto trae el Campo del Encanto, que además tiene juegos. Y el Área Infantil Pony viene con los juegos que tiene; no se rentan por separado.

Del horario: son seis horas en total, de las cuales cinco son activas. Media hora se va en la entrada y media hora en la salida, y las dos están contadas dentro de esas seis. Vale la pena tenerlo claro al armar los tiempos, porque cinco horas de fiesta y seis horas de renta no son lo mismo.

La hora extra existe y casi siempre se pide sobre la marcha, no antes. Se cobra como un porcentaje del precio final, así que depende de la cotización.`;

export const COMO_SE_COBRA = `Aquí se cobra por persona: la renta del espacio y la comida se calculan por invitado. Las amenidades y los servicios van aparte y tienen precio fijo.

Por eso no hay un precio en esta página. El costo depende de cuántos sean, así que un número suelto sería falso para casi cualquiera que lo leyera. Lo que cuesta un evento depende de lo que se contrate, y la cotización se arma en persona, en la visita, con el lugar enfrente.

La primera pregunta que siempre se le hace a un cliente es cómo imagina su evento. Tal cual, porque así como lo imaginen, así se va a construir.

La fecha se aparta cuando entra un anticipo: en el momento en que entra dinero, esa fecha queda apartada. No hay un monto fijo: se acuerda. De ahí en adelante se arma un plan de pagos, con flexibilidad, y una semana antes del evento tiene que estar todo liquidado. Se paga con transferencia o en efectivo; tarjeta no, no hay terminal.

Y quien contesta las solicitudes es el dueño, no un centro de llamadas.`;

export const ALIMENTOS = `Los alimentos se contratan aquí mismo y hay cuatro caminos: el menú de tres tiempos, que es el principal, la taquiza, la barbacoa y el buffet.

El buffet es donde más se nota la diferencia entre formal e informal, y esa palabra aquí significa una cosa muy concreta: si hay servicio o no lo hay. Servicio quiere decir meseros y atención a mesa.

De bebidas se maneja todo: hay bebidas, hay bartender y hay bebidas preparadas. El Salón de los Espejos tiene además su propia barra de bar y una cocina equipada dentro del salón.

Los menús exactos, plato por plato, no están en esta página. Los ponen los proveedores con los que trabajamos y no vamos a publicar una carta que después no se sostenga.

Se puede meter comida de fuera. Depende del evento, así que conviene ponerlo sobre la mesa desde la primera visita. Y si no contratas los alimentos con el recinto, esa parte corre por tu cuenta.`;

export const EXTRAS = `La planta de luz es opcional y siempre se intenta incluir: es un seguro para el evento, por si se va la luz o pasa algo.

La carpa se puede contratar, sobre todo si tu evento va en los jardines, porque ahí no hay control del clima. En el Salón de los Espejos la lluvia no importa, es cerrado. El Salón Encanto tiene carpa.

Hay estacionamiento dentro del recinto.

Y si tu evento es corporativo, el equipo se puede poner desde aquí: proyector, pantalla, sillas y WiFi. También puedes traer el tuyo y rentar nada más el espacio.`;
