/**
 * EL AVISO DE PRIVACIDAD — B-23.
 *
 * ── Por qué existía este bug ────────────────────────────────────────────────
 *
 * El formulario de cotización EXIGE marcar «Acepto el aviso de privacidad y autorizo el
 * tratamiento de mis datos personales» para poder enviarse: sin esa casilla el botón no se
 * habilita. Y ese aviso **no existía**. No había ruta `/aviso-de-privacidad`, ni enlace en la
 * etiqueta, ni nada en el pie del sitio. Comprobado el 2026-09-03 contra producción:
 * `https://jardines-club-hipico.vercel.app/aviso-de-privacidad` → **HTTP 404**.
 *
 * Es decir: se pedía un consentimiento informado a un documento ilegible. Además de la
 * exposición legal (LFPDPPP, artículos 8, 15, 16 y 17), es lo que le pasa a cualquiera que se
 * pare a leer antes de dar su teléfono — y esa persona no envía el formulario.
 *
 * ── De dónde sale cada afirmación de este texto ─────────────────────────────
 *
 * De MEDIR el sistema, no de una plantilla. Cada dato que se dice que se recaba es un campo
 * real del formulario (`FormularioModal.jsx`), cada destino es un destino real:
 *
 *   · Los campos          → `initialForm` y la RPC `jardines.solicitud_crear`.
 *   · Dónde se guardan    → tabla `jardines.solicitudes` (Supabase/PostgreSQL).
 *   · A dónde se avisa    → `api/solicitud.js`, correo al buzón del negocio.
 *   · El borrador         → `sessionStorage`, clave `jch_borrador_solicitud`, 6 horas y solo en
 *                           esa pestaña (`FormularioModal.jsx:28-29`).
 *   · La medición         → `@vercel/analytics` montado en `App.jsx:57`.
 *   · Contacto y domicilio → `src/config/negocio.js`, que a su vez está atado al JSON-LD.
 *
 * Si mañana el formulario pide un campo nuevo, ESTE TEXTO SE QUEDA CORTO. Es la clase de
 * documentación que envejece en silencio, así que va anotado en `docs/NEXT_STEPS.md`.
 *
 * ── LO QUE FALTA Y ES DEL DUEÑO ─────────────────────────────────────────────
 *
 * Este aviso es **veraz y completo respecto de lo que el sistema hace**, que es lo que un
 * programador puede afirmar. Lo que NO puede afirmar, y el dueño tiene que confirmar con quien
 * lleve su parte legal, son dos cosas: la **razón social** exacta del responsable (aquí se usa
 * el nombre comercial) y si quiere designar un **departamento de datos personales** distinto
 * del correo de contacto. Mientras tanto, un aviso cierto y publicado es estrictamente mejor
 * que una casilla obligatoria apuntando a un 404.
 */

import { CORREO, TELEFONO, UBICACION } from '@/config/negocio';

export const RESPONSABLE = `Jardines Club Hípico, con domicilio en ${UBICACION}, es el responsable del
tratamiento de los datos personales que nos proporcionas a través de este sitio.

Puedes contactarnos en cualquier momento en ${CORREO} o al ${TELEFONO}. Ese mismo canal es el
que atiende las solicitudes relacionadas con tus datos.`;

export const QUE_RECABAMOS = `Solo lo que escribes tú en el formulario de cotización, y nada más:

Tu nombre completo y tu teléfono o WhatsApp, que son obligatorios porque sin ellos no hay forma
de responderte. Tu correo electrónico, que es opcional. Y los datos de lo que estás planeando:
el espacio que te interesa, el tipo de evento, la fecha tentativa, el número aproximado de
personas y los comentarios que quieras dejarnos.

Guardamos también desde qué página del sitio enviaste la solicitud. Sirve para saber qué
contenido ayuda a la gente a decidirse, y no identifica a nadie por sí solo.

No te pedimos datos financieros, ni identificaciones oficiales, ni datos personales sensibles
—los que la ley define como origen racial o étnico, estado de salud, información genética,
creencias religiosas o filosóficas, afiliación sindical, opiniones políticas o preferencia
sexual—. Si algún dato de esos aparece escrito en el campo de comentarios, será porque tú
decidiste escribirlo, y recibirá el mismo trato confidencial que el resto.`;

export const PARA_QUE = `Para responderte. Es la finalidad principal y la única necesaria:

Nos comunicamos contigo para resolver tus dudas, preparar tu cotización, agendar una visita al
lugar y, si decides celebrar tu evento con nosotros, organizarlo.

No usamos tus datos para publicidad de terceros, no los vendemos, no los alquilamos y no los
compartimos con nadie para que te ofrezca otra cosa. Si en algún momento quisiéramos usarlos
para una finalidad distinta de la de atenderte, te lo pediríamos antes y por separado.`;

export const DONDE_VIVEN = `Tu solicitud se guarda en nuestra base de datos, alojada en la
infraestructura de nuestros proveedores de servicio (Supabase y Vercel), y se nos avisa por
correo electrónico para poder atenderte pronto. Esos proveedores tratan los datos únicamente
por cuenta nuestra y para que el sitio funcione; no los usan para fines propios.

Mientras rellenas el formulario, el navegador guarda un borrador de lo que llevas escrito para
que no lo pierdas si cambias de página. Ese borrador vive solo en la pestaña que tienes abierta,
se borra a las seis horas o al cerrarla, y nunca sale de tu dispositivo hasta que pulsas enviar.

El sitio usa una herramienta de medición de audiencia (Vercel Analytics) que cuenta visitas por
página de forma agregada. No instala cookies de seguimiento ni construye un perfil tuyo.

Conservamos las solicitudes el tiempo necesario para atenderte y para dejar constancia del
evento si llegamos a organizarlo. Cuando dejan de ser necesarias, se eliminan.`;

export const TUS_DERECHOS = `La ley te reconoce cuatro derechos sobre tus datos, que se conocen
como derechos ARCO: acceder a ellos, rectificarlos si son incorrectos, cancelarlos cuando ya no
quieras que los tengamos, y oponerte a que los usemos para un fin concreto. También puedes
revocar en cualquier momento el consentimiento que nos diste.

Para ejercer cualquiera de ellos basta con escribirnos a ${CORREO} —o por WhatsApp al
${TELEFONO}— diciéndonos qué quieres y desde qué dato de contacto nos escribiste, para poder
identificar tu solicitud. No hace falta ningún formato especial y no tiene ningún costo.

Te responderemos por el mismo medio. Si no quedas conforme con nuestra respuesta, puedes acudir
al Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales
(INAI).`;

export const CAMBIOS = `Si cambiamos la forma en que tratamos tus datos —por ejemplo, si el
formulario empieza a pedir algo que hoy no pide—, actualizaremos este aviso y publicaremos aquí
mismo la nueva versión con su fecha. Vale la pena volver a leerlo si vas a enviarnos una
solicitud nueva pasado un tiempo.`;

/** Fecha de la última revisión. Se muestra al pie del aviso: un aviso sin fecha no dice nada. */
export const ACTUALIZADO = '3 de septiembre de 2026';
