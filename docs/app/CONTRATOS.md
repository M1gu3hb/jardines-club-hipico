# CONTRATOS.md — qué afirma la suite, y qué NO

> `npm run test:contratos` → `node scripts/test-contratos-api.mjs`, **1473 líneas**.
> Ejecutado el **2026-08-24** sobre `9d0e053`:
>
> ```
> 59/59 pasan
> reparto  web 31  ·  portal 0  ·  crm 0  ·  comun 28
> ```
>
> Esta es la red de seguridad principal del repo. **No es una suite de pruebas**: no monta React,
> no abre un navegador y no toca la base. La mayoría son comprobaciones **estáticas** sobre el
> texto del código, y una minoría ejecuta funciones puras. Saber la diferencia es la mitad de
> saber qué te cubre.

---

## 1. Por qué existe

Por un fallo real: `src/lib/notificar.js` seguía mandando `{ titulo, detalle }` cuando
`api/notificar.js` ya exigía `{ accion, eventoId, nota }`. **Compilaba, pasaba el lint, y el correo
se caía en silencio con un 400.** Ninguna prueba de base de datos podía verlo, porque el desajuste
estaba entre dos archivos de JavaScript que nadie compara.

De ahí sale todo lo demás: la suite ata piezas que el compilador no relaciona — el front con la
ruta, la migración con su llamador, la CSP con los orígenes que el bundle pide, el manifiesto de
código común con los archivos reales.

---

## 2. Los 59 contratos, agrupados

### El formulario y su correo (8 + 6 = 14)

| Contrato | Qué ata |
|---|---|
| `solicitud: el front envía solo solicitudId` | El navegador no puede dictar el contenido del correo |
| `solicitud: el front no fabrica folios` | El folio sale de la base o no hay éxito |
| `solicitud: la API relee la fila de la base` | El correo se arma con datos canónicos |
| `solicitud: usa la plantilla dorada común, no un transporter propio` | Una sola fuente de estilo y remitente |
| `solicitud: todo dato de la fila va escapado en el HTML` | Entrada de un desconocido, escapada |
| `solicitud: se conserva el texto plano como alternativa` | Hay clientes que no pintan HTML |
| `solicitud: el replyTo sale de la fila, no del cuerpo` | El dueño responde al cliente real |
| `solicitud: el asunto conserva folio y nombre` | Se puede buscar en el buzón |
| `api/solicitud.js: importa escHtml` | El escapador bueno, no uno propio |
| `api/solicitud.js: sin variables sin escapar en cuerpoHtml` | Recorre los `${}` del template y exige `escHtml(` |
| `api/solicitud.js: sin .catch(() => {}) sobre llamadas a Supabase` | `supabase-js` resuelve con `{ error }`: un `.catch` no atrapa nada |
| `api/solicitud.js: sin .then(() => {}, () => {})` | Lo mismo por la otra vía |
| `api/solicitud.js: comprueba el booleano de idemCerrar` | Un cierre fallido no puede pasar por bueno |
| `api/solicitud.js: audita el incidente si no cerró` | Queda rastro |

### El teléfono de WhatsApp (6, cuatro de ellos **ejecutados**)

Los cuatro marcados `(ejecutado)` importan `telefono.js` y lo **corren** con entradas reales y
hostiles: comprueban que ninguna produzca algo que no sean dígitos, que el enlace sea `wa.me` con
lo que lleve detrás codificado, y que sin número utilizable **no haya enlace y por tanto no haya
botón**. Los otros dos miran el correo de solicitudes y la plantilla.

Es la parte más fuerte de la suite, y no es casualidad: `wa.me/<numero>` abre el chat de **quien
sea** que tenga ese número.

### El escapador de HTML (2, uno **ejecutado**)

`1.2: escHtml escapa de verdad los cinco caracteres (ejecutado)` lo importa y lo llama. El otro
comprueba que la plantilla de correo use ese y no uno propio — había dos, y el débil no escapaba
`'`.

### Migraciones y ledger (5)

`1.1` (×2) compara `APLICADAS.txt` contra los nombres de archivo de `supabase/migrations/`, en los
dos sentidos: que ningún archivo tenga un prefijo que la base no conozca, y que ninguna migración
figure a la vez como aplicada y como pendiente. `1.3` exige que **toda función de una migración no
aplicada** esté revocada de `public` y de `anon`. `4.3` (×2) vigila `sec_29`: que haga lo que dice
y que **siga figurando como pendiente**.

### La migración `sec_25`, aditiva (8)

Ocho comprobaciones sobre un solo archivo: que no borre, no reescriba, no toque policies ni
grants, **no toque nada del schema `public` (Vero)**, que el `on delete set null` no se lleve el
evento al borrar la solicitud, y que compruebe sus cuatro precondiciones (columna inexistente, PK
esperada, tipo `uuid`, RLS activo antes y después).

### El teléfono del negocio y los respaldos (5)

`1.4` (×4): `negocio.js` declara `WHATSAPP` y `TELEFONO`, son **el mismo número**, el JSON-LD de
`index.html` lo publica, y **ningún componente escribe un teléfono a mano**. `1.5`: ningún respaldo
inventa datos del negocio. Nacen de que los respaldos enseñaban cinco salones inexistentes y un
teléfono que no era el del salón.

### Arranque y degradación (3)

`3.1` una lectura colgada no puede dejar la portada en blanco · `3.2` hay un error boundary **y
envuelve la aplicación entera** · `3.3` una variable de entorno que falta se ve en la página, no
solo en la consola.

### CSP e imágenes (3)

`9D`: ningún componente público carga imágenes de un origen que la CSP bloquea; los medios
auto-hospedados que se citan **existen** en `public/`; e `img-src` **sigue** sin admitir orígenes
de terceros. Este último es el que impide ensanchar la CSP para tapar un problema.

### La separación en tres apps (6)

`web: /portal y la invitación redirigen 301 a otra aplicación` · `web: el portal del menú sale de
una variable y el manejador sabe salir del router` · `comun: las tres URL se declaran UNA vez, en
api/_lib/urls.js` · `comun: ningún correo añade ya el sufijo /portal a URL_PORTAL` · `comun: el
shim no nombra ninguna ruta que esta aplicación no tenga desplegada` ·
`compartidos: los 25 archivos comunes siguen siendo la copia registrada`.

### El video temporal del hero (4)

`TEMP` ×4: que se apague con un booleano y **lo de antes vuelva entero**, que vaya a resolución
real y el fondo nunca suene, que el audio entre tras un gesto y se calle al salir del hero, y que
se descargue durante el splash una sola vez.

### Otros (3)

`A.2` (`sec_26` acota la escritura del cliente a sus cuatro columnas) · `W.2` (los campos de texto
obligatorios se comprueban **recortados**, no con `!!`) · `reparto` (el meta-contrato: **ningún
contrato puede quedarse sin declarar a qué aplicación viaja**).

Los once grupos suman **59**: 14 + 6 + 2 + 5 + 8 + 5 + 3 + 3 + 6 + 4 + 3.

---

## 3. Lo que la suite NO cubre

Esta sección importa más que la anterior.

### 3.1 No ejecuta la aplicación

No monta React, no renderiza un componente, no hace clic en nada, no abre un navegador y **no
toca la base ni la red**. Un componente puede compilar, pasar los 59 contratos y romperse en el
primer render. **No hay pruebas unitarias, ni de integración, ni end-to-end.** Cero.

### 3.2 Diecisiete comprobaciones no corren en este repo

Varios bloques están guardados por `hay("<ruta>.js")` y se adaptan al `api/` que exista. Aquí solo
existe `solicitud.js`, así que **no corren** las comprobaciones de `crear-admin.js`,
`crear-usuario-evento.js`, `canjear-acceso.js`, `notificar.js`, `correo-cliente.js` y
`cron-recordatorios.js` — **diecisiete en total**, contadas en el código.

Eso está bien pensado (el mismo archivo vive en los tres repos y se adapta solo) y a la vez es una
trampa: **`59/59` no significa «59 propiedades comprobadas del proyecto»**, significa «59 de las
que aplican aquí». Las otras diecisiete las corren el portal y el CRM.

### 3.3 El manifiesto de código común solo ve ESTE repo

`compartidos: los 25 archivos comunes siguen siendo la copia registrada` compara el `sha256` de
cada archivo con el registrado. El nombre del contrato lo genera el propio manifiesto
(`manifiesto.archivos.length`), así que **la cifra se mueve sola** cuando se registra un archivo
más: hoy son **25**, veinticuatro de código y uno de documentación (`docs/ECOSISTEMA.md`).
Ojo con lo que **no** entra: la lista `propios` de ese mismo JSON —188 rutas, entre ellas todo
`docs/app/`— es inventario y **nadie la hashea**.

**Detecta** que alguien editó código común aquí sin pasar por el manifiesto. **No detecta** que
el portal o el CRM hayan cambiado *su* copia: en CI cada repo se verifica contra su propio
registro. La comparación entre los tres solo funciona con los tres presentes en la misma máquina.
Está dicho, no aparentado, en `scripts/compartidos.json`. Lo resuelve de verdad extraer el
paquete compartido.

### 3.4 El ledger de migraciones no es la base

`APLICADAS.txt` es una **copia a mano** del ledger de Supabase. Los contratos `1.1` comparan esa
copia con los **nombres de archivo**. Si la copia se queda atrás respecto a Postgres, los
contratos siguen en verde y mienten los dos a la vez. **Nada aquí consulta la base.**

### 3.5 Lo estático es estático

Un contrato que busca `escHtml` en un archivo comprueba que el texto `escHtml` esté ahí, no que se
haya llamado en el camino que importa. La suite mitiga esto con `entre()` (recortar el trozo que
importa) y `cortaAntesDe()` (afirmar sobre el **orden**, no sobre la distancia en caracteres), y
con un despiece de comentarios que distingue cadenas, regex y comentarios de verdad — porque
`"image/*"` contiene `/*` y el regex ingenuo se comía medio archivo, cegando contratos en
silencio.

Aun así: **un contrato mal atado es peor que no tener contrato**, porque afirma en su nombre una
propiedad que ya no se cumple. Ya pasó cuatro veces en esta suite (`idsActivos`, `inertesDe`,
`ocupadaPersona`, `imagenPlanoPath`).

### 3.6 No cubre el resto del proyecto

Nada de aquí dice nada del portal ni del CRM. `reparto` sale `portal 0 · crm 0` **a propósito**:
esos contratos viajaron a sus repos en la FASE 6.

---

## 4. Cómo escribir uno nuevo

1. **Recorta el trozo que importa** con `entre()` y afirma sobre él. Si el contrato habla de UI,
   tiene que mirar el render **y** el manejador.
2. **Si lo que importa es el orden, afirma sobre el orden** (`cortaAntesDe()`). Un
   `[\s\S]{0,400}` no dice nada sobre si un texto gobierna al otro.
3. **Tolera el espaciado** (`\s*`): partir un `if` en tres líneas no es una regresión.
4. **Declara su zona** con `zona("web" | "portal" | "crm" | "comun")` antes del bloque. Se etiqueta
   por **sección**, no por contrato, porque muchos nacen dentro de bucles y etiquetarlos en el
   call-site dejaría decenas sin etiqueta. El meta-contrato final falla si alguno se queda sin ella.
5. **Valídalo mutando**: reintroduce la regresión real en el archivo real, ejecuta la suite y
   míralo **fallar**; restaura con `git checkout -- <archivo>` y comprueba que
   `git status --porcelain` sale vacío. Muta también algo **inocuo** y comprueba que pasa.
6. Si una propiedad **no se puede expresar estáticamente** sin quedar frágil, **dilo y no escribas
   el contrato**.

Guion completo y casos reales: `docs/PROMPTS.md` §9 y `docs/DECISIONS.md` D-COD-15.

---

## 5. En una frase

La suite es buena atando **lo que un archivo dice de otro** —el front con su ruta, la migración
con su llamador, la CSP con el bundle, la copia con su registro— y **no sabe nada** de si la
aplicación funciona. Para eso hace falta una persona delante de la pantalla, y esas cinco casillas
siguen sin marcar: `docs/app/NEXT_STEPS.md` §0.
