# VALIDACIÓN — guion para el dueño

> Para Miguel. **No hace falta saber de código.** Haces algo, y compruebas que pasa lo que dice
> aquí. Si algo no coincide, en cada apartado está dónde mirar.
>
> **Este es el documento único para cerrar el proyecto.** Desde que se escribió han entrado los
> bloques 7, 8 y 8F, así que ahora tiene tres partes:
>
> | Parte | Qué es | ¿Bloquea el cierre? |
> |---|---|---|
> | ~~**Parte 0**~~ | ~~Borrar los tres duplicados de «Boda ortega»~~ | **Ya está hecha** |
> | **Parte 1** | Las seis cosas nuevas que hay que ver funcionando | Sí |
> | **Parte 2** | Los cinco flujos originales, con credenciales reales | Sí |
> | Anexo | Las dos pantallas que nadie ha visto nunca | No |
>
> Desplegado el **2026-08-04** · commit `1b0fb4f` (PR #10) · <https://jardines-club-hipico.vercel.app>
>
> Este guion describe **lo que está en producción**. El bloque 9F no lo está todavía; no cambia
> nada de lo que aquí se pide.

---

## Antes de empezar

**Lo que necesitas a mano:**

- La dirección del panel. **No es `/Admin`** (esa da "página no encontrada" a propósito). Es la
  ruta secreta que ya tienes guardada — la misma de siempre.
- Tu usuario y contraseña de administrador.
- Acceso a un correo que puedas abrir para hacer de "cliente de prueba".
- Un segundo navegador, o una **ventana de incógnito**. La vas a necesitar en las pruebas 2, 3 y 5:
  si usas la misma ventana donde estás como administrador, no estarás probando lo que ve el cliente.

**Crea un evento de prueba**, no uses uno real. Ponle un nombre que se reconozca, por ejemplo
`PRUEBA VALIDACION`. Al terminar puedes borrarlo.

**Dos cosas que ya sabemos y NO son fallos:**

1. **El enlace de primer acceso caduca a las 72 horas y sirve UNA sola vez.** Si lo abres, entras,
   y luego vuelves a abrir el mismo enlace, el segundo intento **tiene que fallar**. Eso es lo
   correcto: es lo que impide que alguien que vea el correo reenviado entre con él. Si quieres
   repetir la prueba, hay que generar un enlace nuevo.
2. **Todos los correos enlazan a `jardines-club-hipico.vercel.app`**, no al dominio propio. Está
   escrito a mano en el código (`api/_lib/correo.js`, bug **J-01**) y se cambia el día que se
   conecte el dominio. Los enlaces funcionan; solo no llevan el nombre definitivo.

**Si algo falla, hay tres sitios donde mirar** (los tres se citan en cada prueba):

| Dónde | Qué es | Cómo llegar |
|---|---|---|
| **Logs de Vercel** | lo que dijo el servidor | vercel.com → proyecto `jardines-club-hipico` → **Logs** |
| **Auditoría** | qué registró la base | Supabase → SQL Editor → `select * from jardines_private.auditoria order by ocurrido_at desc limit 20;` |
| **Bandeja de correo** | si salió el mensaje | incluida la carpeta de **spam** |

---

---
---

# LO QUE TIENES QUE APROBAR

> Cuatro cosas. Ninguna se ha hecho: están escritas y ensayadas, esperando tu visto bueno. Las
> dos primeras son cambios en la base de datos; las dos últimas no las puedo hacer yo.

| Qué | Si dices que sí | Si dices que no |
|---|---|---|
| **`sec_26`** — la invitación digital | Tus clientes podrán crear y compartir su invitación por WhatsApp, ver quién confirma, y **cambiar el enlace** si se les filtra. Hoy esa pantalla existe en su portal pero **nunca ha guardado nada** | Se queda como está: la pantalla les dice claramente que no está habilitada, en vez de fingir que guardó. Y la opción alternativa sigue abierta: que la actives tú desde el panel |
| **`sec_27`** — permisos | Las tablas nuevas dejan de nacer abiertas a cualquier visitante anónimo. Y con ella van el **tablero de meseros** (hoy marca 0 aunque se registren invitados) y el **control de aforo** (hoy se puede vender la misma mesa dos veces) | Las tres cosas siguen igual. El tablero avisa de que su número puede no ser el real, y el cupo por defecto ya es el que queda libre, así que el riesgo baja — pero no desaparece |
| **El bucket `sitio` admitiendo PDF** | Podrás subir el menú en PDF desde el panel. Hoy el botón existe y **no funciona nunca**: el almacén no acepta ese tipo de archivo | Sigue sin poder subirse. Es un ajuste de la consola de Supabase, no código |
| **Un aviso de privacidad** | El formulario público podrá seguir pidiendo que lo acepten. Hoy **obliga a aceptar un documento que no existe**: no hay página, ni enlace, ni texto | Habría que quitar la casilla, porque pedir que acepten algo inexistente no se sostiene |

**Nada de esto corre riesgo de romper lo que ya funciona.** Las dos migraciones se ensayaron
contra la base real dentro de una transacción que se deshace sola, y en las dos se comprobó que
Vero Seguros queda idéntico antes y después.

---
---

# PARTE 0 — HECHA ✔

> Los tres duplicados de «Boda ortega» **ya están borrados**, y ese fue el primer uso real del
> borrado de eventos: se comprobó fila a fila contra la base y salió limpio — 0 huérfanos en las
> 14 tablas que cuelgan de `eventos`, 0 objetos sueltos en el bucket, 0 perfiles sin usuario, y
> los 2 usuarios de portal vivos casan exactamente con los 2 eventos que quedan.
>
> **No hay que hacer nada aquí.** Si ves una sola «Boda ortega» en la lista, es la correcta: la
> que tiene la cuenta `ortega-jch`.

---
---

# PARTE 1 — Lo que ha cambiado y hay que ver funcionando

## 1.1 · El tipo de documento: ahora son tres y las tres funcionan

**Qué pasaba:** el desplegable ofrecía cuatro tipos y la base solo admite tres. Elegir
**«comprobante»** hacía que la subida fallara siempre. Nunca funcionó, desde el primer día.

**Qué hacer:** ficha de un evento → **Documentos** → sube un archivo con cada uno de los tres
tipos: **cotización**, **contrato** y **otro**.

**Qué debe pasar:** los tres suben y aparecen en la lista. **Ya no existe la opción
«comprobante»**.

**Cómo sé que falló:** si alguno da error al subir, copia el mensaje — ahora los errores están
escritos en cristiano, no en jerga de base de datos.

## 1.2 · El botón «Avisar»: funciona por primera vez

**Qué pasaba:** llevaba meses devolviendo error. Pedía a la base una columna que no existe, así
que **fallaba siempre**, en todos los casos, y además dejaba anotado en la auditoría que habías
intentado tocar un documento ajeno — algo que no habías hecho.

**Qué hacer:** en un documento de un evento **que tenga correo de contacto**, pulsa **Avisar**.
Hazlo con una **cotización** y luego con un **contrato**.

**Qué debe pasar:**
- El botón confirma que se envió.
- **Llega el correo al cliente.**
- **El titular corresponde al tipo:** en la cotización habla de la cotización; en el contrato,
  del contrato. Antes decía «cotización» pasara lo que pasara — eso ya no.

**Cómo sé que falló:** si no llega, mira **spam** primero. Si sigue sin llegar, dímelo.

## 1.3 · El estatus de una solicitud: ahora se guarda

**Qué pasaba:** cambiar el estatus no hacía nada y no avisaba de nada. Los nombres del panel no
coincidían con los que la base admite.

**Qué hacer:** **Solicitudes** → cambia el estatus de una.

**Qué debe pasar:** aparece **«Guardado»**, y si recargas la página el cambio **sigue ahí**. Las
opciones ahora son: `Nueva`, `En proceso`, `Cotizada`, `Cerrada`, `Descartada` — **los nombres
cambiaron**, ya no hay «En revisión», «Confirmada» ni «Cancelada».

**Cómo sé que falló:** si recargas y volvió al valor anterior, no se guardó. Antes eso pasaba en
silencio; ahora tiene que salir un mensaje de error.

## 1.4 · La actividad del portal: se puede quitar

**Qué pasaba:** el bloque de actividad del inicio crecía sin límite y no había forma de quitar
nada.

**Qué hacer:** **Inicio** → en «Actividad del portal», quita un aviso.

**Qué debe pasar:** desaparece y **no vuelve** al recargar. Además se limpia sola: los avisos de
más de **7 días** se borran cada noche.

## 1.5 · El selector de archivos: solo deja elegir lo que se puede subir

**Qué hacer:** en **Documentos**, pulsa «Elegir archivo» y mira qué te deja seleccionar. Si
tienes una foto **HEIC** de iPhone, pruébala.

**Qué debe pasar:** solo deja elegir PDF, JPG, PNG, WEBP y AVIF. Un **HEIC se rechaza antes de
subirse**, con un mensaje que te dice que lo conviertas a JPG (en el iPhone: Ajustes → Cámara →
Formatos → «Más compatible»).

**Por qué importa:** antes el selector dejaba elegir cualquier imagen y el rechazo llegaba
después, ya subiendo, con un error que no explicaba nada.

## 1.6 · «Cargando», «vacío» y «falló» ya no se ven igual

**Qué pasaba:** cuando una pantalla no podía leer los datos, ponía **«no hay nada»** — que es
mentira. Daba igual que estuviera cargando, que de verdad estuviera vacío, o que la lectura se
hubiera caído: las tres cosas se veían igual.

**Qué hacer:** ve entrando por las secciones del panel y del portal, y **fíjate en el medio
segundo mientras cargan**.

**Qué debe pasar:**
- **Mientras carga:** bloques grises con la forma de lo que va a aparecer.
- **Si de verdad está vacío:** un texto que lo dice, tipo «No hay servicios. Crea el primero.»
- **Si algo falla:** un recuadro rojo que dice **que no se pudo cargar, no que esté vacío**, con
  un botón de **Reintentar**.

**Cómo sé que falló:** si ves «no hay nada» en una sección donde **sabes** que hay cosas, o si
algo se queda cargando para siempre. Cualquier cosa rara al cargar, apúntala y dímela — aunque
te parezca una tontería.

---
---

# PARTE 2 — Los cinco flujos originales

> Estos siguen **sin validar con credenciales reales**. Son los que cierran el blindaje de
> seguridad.

## Prueba 1 — Alta de cliente (crear evento + credenciales)

**Qué hacer**

1. Entra al panel con tu cuenta de administrador.
2. Ve a **Eventos** → crea uno nuevo. Ponle `PRUEBA VALIDACION`, elige salón y fecha, y guarda.
3. Abre el evento y quédate en la pestaña **Datos**.
4. Abajo, en **Credenciales de acceso**, escribe un usuario (por ejemplo `pruebavalidacion`) y una
   contraseña de **al menos 8 caracteres**. **Apúntalos**, los necesitas en la prueba 2.
   *(Eran 6 en una versión anterior de este guion; el panel y el servidor exigen 8 y coinciden
   desde el bloque 9. Si tecleas 6 el panel te lo rechaza, y eso es lo correcto.)*
5. Pulsa **Crear credenciales**.

**Qué debe pasar**

- Aparece un mensaje verde: *"Credenciales creadas. Usuario: pruebavalidacion"*, y si el evento
  tenía correo del cliente, añade *"Se envió el correo de bienvenida con sus accesos al cliente"*.
- La cabecera del evento pasa de "Sin credenciales de acceso" a **"Acceso: pruebavalidacion"**.
- El formulario de usuario y contraseña **desaparece**. No debe volver a pedírtelos.

**Cómo sé que falló**

- Sale **"Usuario: undefined"**, o el formulario vuelve a aparecer pidiendo credenciales para un
  evento que ya las tiene. → Logs de Vercel, función `crear-usuario-evento`.
- Sale un mensaje de error rojo. → Logs de Vercel, y `auditoria` buscando `crear_usuario_evento`.
- Si pulsas dos veces seguidas y la segunda dice *"Ese usuario ya existía"*: **eso es correcto**,
  no un fallo. Es la protección contra el doble clic.

---

## Prueba 2 — Enlace de primer acceso

Esto es el correo de bienvenida que recibe el cliente, con un enlace que lo mete a su portal sin
teclear nada. **Solo se puede usar una vez y caduca a las 72 horas.**

**Qué hacer**

1. Abre el buzón del correo que pusiste como cliente del evento (mira también **spam**).
2. Busca el correo de bienvenida de Jardines Club Hípico.
3. **Copia el enlace** del botón de entrar. Vas a necesitarlo dos veces.
4. Abre una **ventana de incógnito** y pega el enlace.
5. Cuando hayas entrado y visto el portal, **cierra**, abre otra ventana de incógnito, y pega
   **el mismo enlace otra vez**.

**Qué debe pasar**

- **Primera vez:** entra directo al portal del cliente, sin pedir usuario ni contraseña. Se ve el
  nombre del evento y su información.
- **Segunda vez:** **falla**. Mensaje genérico de enlace no válido o expirado. **Esto es lo
  correcto** — si entrara dos veces, sería el fallo.
- El usuario y la contraseña de la prueba 1 siguen funcionando en `/portal` de la forma normal.

**Cómo sé que falló**

- El enlace **no entra ni la primera vez**. → Logs de Vercel, función `canjear-acceso`; y
  `auditoria` buscando `canjear_acceso`.
- El enlace **sí entra la segunda vez**. Eso sí es un fallo serio: avísame.
- No llega el correo. → Comprueba que el evento tiene correo de cliente guardado, y mira los logs
  de la función `crear-usuario-evento`: ahí se ve si el envío salió o no.

---

## Prueba 3 — Documento

**Qué hacer**

1. En el panel, dentro del evento de prueba, pestaña **Documentos**.
2. Sube un archivo cualquiera (un PDF pequeño sirve). Ponle un título reconocible.
3. En la ventana de incógnito donde entraste como cliente (prueba 2), recarga y busca sus
   documentos.

**Qué debe pasar**

- En el panel, el documento aparece en la lista con su título.
- En el portal del cliente, aparece **ese mismo documento** y se **abre o descarga** al pulsarlo.
- El cliente **solo** ve los documentos de **su** evento.

**Cómo sé que falló**

- Sube pero no aparece en la lista del panel → recarga la página; si sigue sin aparecer, avísame.
- Aparece en el panel pero **no** en el portal del cliente → es un problema de permisos.
  `auditoria`, buscando `documento`.
- Aparece pero al pulsarlo da error o página en blanco → problema del archivo en Storage. Logs de
  Vercel.

---

## Prueba 4 — Aviso de cotización

**Qué hacer**

1. En el panel, pestaña **Documentos** del evento de prueba.
2. En el documento que subiste, pulsa el botón **Avisar** (el del avioncito, "Avisar al cliente por
   correo que este documento está listo").

**Qué debe pasar**

- Confirmación en pantalla de que el aviso salió.
- **Llega un correo** al cliente diciendo que tiene un documento listo, con un enlace a su portal.
- El correo enlaza a `jardines-club-hipico.vercel.app` — ya explicado arriba, no es un fallo.

**Cómo sé que falló**

- Error en pantalla al pulsar Avisar. → Logs de Vercel, función `correo-cliente`.
- No sale error pero **no llega el correo** (mira spam). → Logs de Vercel; y `auditoria` buscando
  `correo_cliente`: si aparece con resultado `error`, el envío falló; si aparece con `ok`, el
  correo salió y el problema está en el buzón.

---

## Prueba 5 — Link de meseros

Es el enlace que compartes con el personal el día del evento. Les deja escanear los QR de los
invitados y ver el avance de mesas **sin entrar al panel**.

**Qué hacer**

1. En el panel, dentro del evento de prueba, pestaña **QR / Meseros**.
2. Copia el enlace que aparece ahí (botón de copiar).
3. Ábrelo en una **ventana de incógnito**.

**Qué debe pasar**

- Se abre una pantalla de meseros con el evento. **No** pide usuario ni contraseña.
- **No** da acceso al panel de administración ni a datos de otros eventos.
- El enlace se puede volver a abrir las veces que haga falta: este **no** es de un solo uso, a
  diferencia del de la prueba 2. Es para todo el equipo durante el evento.

**Cómo sé que falló**

- El enlace lleva a "página no encontrada" o a una pantalla vacía. → Avísame.
- Pide credenciales. → No debería: avísame.
- Muestra información de **otro** evento. Eso sería grave: avísame de inmediato.

---

## Cuando termines

Dime, para cada prueba, si pasó o no. Si algo falló, con lo que viste en pantalla es suficiente —
yo miro los logs.

**Lo importante de todo esto**, por orden: la prueba **1.2** (el botón «Avisar» nunca ha funcionado, así que es la primera vez que
alguien ve si el correo sale bien) y las cinco pruebas de la **Parte 2**, que son las que cierran
el blindaje.

Después puedes **borrar el evento de prueba**. También quedó una solicitud de prueba en el
formulario público, con folio `JCH-828EF1` y nombre **PRUEBA DEPLOY**: es del despliegue, se puede
borrar cuando quieras.

---
---

# ANEXO — Las dos pantallas nuevas (no bloquean lo de arriba)

> Estas dos **no forman parte de la validación de los cinco flujos**. Se construyeron en los
> bloques 3 y 4 y están verificadas por partes, pero nadie las ha visto funcionar en pantalla. Si
> algo falla aquí, **no bloquea nada** de lo anterior: apúntalo y sigue.

## A · Plano por salón

**Dónde:** panel → **Salones** → abre cualquiera de los 8 → el bloque **Plano del salón** dentro
del formulario.

Hoy **ningún salón tiene plano** (0 filas), así que empiezas de cero.

| Paso | Qué hacer | Qué debe pasar |
|---|---|---|
| 1 | Pulsa **Subir plano** y elige una imagen (JPG, PNG, WebP o AVIF, máx. 10 MB) | Aparece la miniatura, y debajo **"ancho × alto px · es el lienzo del editor de mesas"** con las medidas reales |
| 2 | Prueba a subir un **SVG** o algo de más de 10 MB | Lo **rechaza** con un mensaje claro, sin subir nada |
| 3 | Ve a un evento de ese salón → pestaña **Mesas** | El plano se ve **de fondo** en el editor, en vez de la rejilla |
| 4 | Coloca dos o tres mesas y guarda | Se quedan donde las pusiste |
| 5 | Vuelve al salón y pulsa **Reemplazar** con **otra imagen de proporción distinta** | El plano cambia. **Vuelve al editor: las mesas deben seguir sobre el mismo punto del dibujo.** Si se desplazan, apúntalo |
| 6 | Cambia de un salón a otro **sin recargar la página** | Cada salón muestra **su** plano. Nunca debe verse el del anterior mientras carga |
| 7 | Pulsa **Quitar** | Desaparece la miniatura y vuelve el botón de subir |

**Si falla:** el mensaje de pantalla es lo importante. Si dice *"No se pudo confirmar el
guardado… recarga y revisa el plano antes de reintentar"*, **haz eso: recarga y mira** antes de
volver a intentarlo. Ese mensaje significa que puede haberse guardado y el sistema prefiere no
tocar nada a arriesgarse a borrar algo bueno.

## B · Asignación de personal

**Dónde:** panel → **Personal del evento**.

**⚠️ Aviso importante, léelo antes:** hoy **no hay ningún evento con el operativo encendido**
(`operativo_activo`), así que la pantalla dirá *"No hay eventos con el operativo activo, así que
no hay nada que asignar"* y **no podrás probar los pasos 2 y 3**. Ese interruptor todavía no se
maneja desde el panel (bug **J-07**): hay que encenderlo desde Supabase. **Dime si quieres que lo
encienda para un evento de prueba** — no lo he tocado porque cambia quién ve qué en producción.

Lo que **sí** puedes comprobar hoy es el paso 1 y el 4, que es el importante.

| Paso | Qué hacer | Qué debe pasar |
|---|---|---|
| 1 | Abre la sección | Aparecen los **3** operativos, los tres con **"Ve TODOS los eventos activos"** en dorado |
| 2 | *(requiere un evento con operativo activo)* Pulsa el chip de un evento para una persona | El chip se pone verde con una palomita y su estado pasa a "Ve 1 evento asignado" |
| 3 | *(ídem)* Vuelve a pulsarlo para revocar | El chip vuelve a gris. Si esa persona se queda en 0 eventos, sale un **aviso** en dorado, pero **sí te deja** — quitar una asignación es una decisión tuya |
| 4 | **El guardarraíl:** en cualquiera de los 3, pulsa el botón dorado **"Acceso a todos"** | **Debe bloquearse** con un mensaje rojo: *"No se puede quitar el acceso a todos los eventos de … se quedaría con 0 eventos y no podría trabajar. Asígnale primero al menos un evento."* Y bajo su nombre, un texto gris explicando lo mismo |

**El paso 4 es el que importa.** Si el botón **sí** apagara el acceso y dejara a alguien en cero,
ese operativo no vería **ningún** evento — y si pasa en pleno evento, se queda sin poder trabajar.
Que se bloquee es lo correcto.

**Ojo:** ese bloqueo vive **solo en esta pantalla** (bug **J-06**). Desde Supabase se puede apagar
igualmente. No lo hagas sin avisar.
