# PLAN-EXPANSION.md — partir Jardines en tres aplicaciones

> **2026-08-23 · Documento de PLANIFICACIÓN. Nada de esto está implementado.**
>
> Se escribe antes de tocar arquitectura, a petición del dueño, para que el trabajo se pueda
> retomar desde otra máquina sin perder el contexto ni volver a decidir lo ya decidido.
>
> Si algo de aquí contradice a `docs/ESTADO.md`, gana `ESTADO.md`: este documento habla del
> futuro, aquel del presente.

---

## 1. Decisiones YA TOMADAS — no se reabren

Están fijadas por el dueño. Cualquier sesión que las cuestione está perdiendo el tiempo.

| Decisión | Detalle |
|---|---|
| **UN solo proyecto de Supabase** | `vuzyhbiwnnngeohysxcw`, el mismo que hoy. No se puede abrir otro. Todo el aislamiento tiene que conseguirse dentro de él. |
| **TRES repositorios de GitHub** | El actual se queda como **web pública**. Se crean dos nuevos: **portal del cliente** y **CRM / punto de venta**. |
| **El dominio actual NO se mueve** | `jardinesclubhipico.com` ya tiene tráfico y posicionamiento en Google. La web pública se queda donde está, con su historia. |
| **El portal del cliente es una PWA** | Instalable en el teléfono, para que el cliente no tenga que entrar a la página y navegar hasta el portal. |
| **El MCP vive en el CRM** | El conector para operar desde ChatGPT pertenece al punto de venta, no a la web pública. |
| **Fuera el auto-redirect al portal** | Hoy, entrar a la home con sesión de cliente te empuja al portal (`src/pages/Home.jsx`, ver §7). Estorba. Con la separación desaparece solo. |
| **Vero Seguros no se toca** | Sigue el candado de `CLAUDE.md`. Cinco apps sobre un proyecto y Vero es una de ellas. |

---

## 2. Inventario medido — 2026-08-23

No es de memoria: son consultas a producción y al repo.

**Backend (compartido por todo)**

| | |
|---|---|
| Tablas `jardines` / `public` (Vero) | 32 / 6 |
| Funciones `jardines` / `jardines_private` | 42 / 11 |
| Policies RLS en `jardines` | 123 |
| **RPC que `anon` puede ejecutar** | **8** (las rutas por token: invitación, staff, acceso) |
| `auth.users` | 9 — **compartida con Vero** |
| Buckets de Storage | 5 (`sitio`, `clientes`, `planos`, `operativo`, `site-media` ← de Vero) |
| Migraciones en el ledger | 56 · `sec_29` escrita y **sin aplicar** |
| Datos vivos | 2 eventos · 12 solicitudes |

**Frontend (lo que hay que partir)**

| | |
|---|---|
| Componentes `.jsx` | 135 |
| Rutas en `App.jsx` | 10 |
| Funciones serverless en `api/` | 8 |
| Contratos | 322 |
| **Bundle público** | **1 solo archivo de 1073 KB** |

---

## 3. Tres correcciones al planteamiento inicial

### 3.1 · Separar las apps protege LA SESIÓN, no LOS DATOS

Las tres aplicaciones van a hablar con la misma Supabase usando **la misma `anon key`, que es
pública por definición** — va dentro del JavaScript que descarga cualquiera. La frontera de datos
seguirá siendo **RLS + el rol dentro del JWT**, no el dominio desde el que se cargó el código.

Traducido: **si RLS está mal, separar no salva nada.**

Lo que la separación sí da, y es real y vale la pena:

- **Aislamiento de origen.** Hoy las tres viven en el mismo origen y comparten `localStorage`, que
  es donde Supabase guarda la sesión. Un XSS en la web pública puede leer la sesión de admin.
  En dominios distintos, no puede: el navegador lo impide.
- **Superficie de código.** Medido hoy: el bundle público de 1073 KB contiene `gestion-jch`
  (el slug secreto del admin), `AdminSolicitudes` y la referencia a `eliminar-evento`. **Cualquier
  visitante de la página se descarga el panel de administración.** Eso se termina.

### 3.2 · El valor de negocio no puede ir detrás de la refactorización

El punto 10 del alcance —activar los portales de los eventos ya confirmados— es lo que produce
dinero, y depende de terminar portal + mesas + QR, **no** de haber separado las apps. Ponerlo
después de la separación lo retrasa meses.

Pero terminar esas funciones dentro del monolito para luego moverlas es trabajo doble.

**La salida:** separar **primero el portal del cliente** —que es el que más va a crecer y el menos
acoplado— y construir invitados/mesas/QR ya en su casa definitiva. La web pública y el CRM pueden
seguir juntos un tiempo más sin que duela.

### 3.3 · Hay deuda que, si no se mata antes, se multiplica por tres

Ver §6. La más cara: **577 MB de medios versionados en git**.

---

## 4. Cómo se consigue el aislamiento con UN solo Supabase

Esta es la pregunta central ahora que el proyecto único es una decisión fija. Se consigue, pero
con disciplina en seis frentes. Ninguno es opcional.

### 4.1 · Un origen distinto por aplicación

Es la medida que más aporta, y es gratis.

```
jardinesclubhipico.com            → web pública   (SE QUEDA: tráfico y SEO)
portal.jardinesclubhipico.com     → portal cliente (PWA)
<dominio aparte o subdominio no adivinable> → CRM / punto de venta
```

Orígenes distintos ⇒ `localStorage` distinto ⇒ **las sesiones no se comparten**. Un XSS en la web
pública deja de poder tocar la sesión del admin.

> Para el CRM conviene un dominio **separado**, no un subdominio, si se quiere el máximo
> aislamiento frente a un subdominio comprometido. Es una decisión pendiente.

### 4.2 · `storageKey` explícito en cada cliente de Supabase

Aunque los orígenes sean distintos, hay que fijarlo a mano:

```js
createClient(url, anonKey, {
  db: { schema: "jardines" },
  auth: { storageKey: "jch-portal" },   // distinto en cada app
});
```

Sin esto, dos apps que acaben compartiendo origen (por un proxy, un `vercel.app` común, un
entorno de preview) se pisan la sesión entre ellas.

### 4.3 · RLS por ROL, que es lo único que protege los datos

El rol viaja en el JWT y vale igual desde cualquier app. Es la frontera real. **Y tiene dos
huecos conocidos y abiertos** (`docs/ESTADO.md`, J-10 y J-11):

- Las policies conceden **la fila entera**, no columnas: un admin puede escribir `auth_user_id`
  y `documentos.archivo_url` desde el navegador.
- `eventos_del` permite borrar un evento desde el navegador, así que el orden «archivos primero»
  del endpoint de borrado es **convención, no garantía**.

**Cerrarlos es requisito previo de la separación**, no un extra: con tres apps la superficie
crece y esos huecos dejan de ser teóricos.

### 4.4 · `service_role` jamás sale del servidor

Cada app tendrá sus propias funciones serverless. La clave de servicio vive solo ahí, nunca en el
bundle. Hoy ya es así en las 8 rutas de `api/`; con tres apps hay que mantenerlo en las tres.

### 4.5 · Saber qué app hizo qué

Ya existe `jardines_private.auditoria`. Con tres aplicaciones escribiendo sobre las mismas tablas,
**hay que añadir de qué app viene cada operación**. Sin eso, investigar un incidente es adivinar.

### 4.6 · Las RPC públicas son la superficie compartida

Son **8** las que `anon` puede ejecutar. Son el único camino por el que un desconocido toca la
base. Cada vez que se añada una, la pregunta es: ¿qué app la necesita, y por qué tiene que poder
llamarla alguien sin sesión?

---

## 5. Qué se lleva cada repositorio

| | Web pública | Portal cliente (PWA) | CRM / punto de venta |
|---|---|---|---|
| **Repo** | el actual | nuevo | nuevo |
| **Dominio** | el de hoy | subdominio | por decidir |
| Home, salones, servicios, amenidades, FAQ | ✅ | | |
| Formulario de cotización | ✅ | | |
| SEO, sitemap, JSON-LD | ✅ | ❌ noindex | ❌ noindex |
| Portal del cliente | | ✅ | |
| Invitaciones, RSVP, invitados | | ✅ | |
| Mesas, plano, QR/boletos | | ✅ | ✅ (el admin también) |
| Panel admin, solicitudes, eventos | | | ✅ |
| Vista de meseros / staff | | | ✅ |
| **MCP** | | | ✅ |
| `manifest.json` + `sw.js` | ⚠️ hoy están aquí | **deben mudarse aquí** | |

**Compartido entre las tres** (y este es el problema de diseño más importante del reparto):

- El shim de acceso a datos (`src/api/base44Client.js`)
- Los catálogos que son espejo de restricciones de la base (`src/lib/catalogos.js`)
- Las reglas de credenciales, fechas, escapado de HTML
- Los contratos que hablan del backend

---

## 6. Deuda que hay que matar ANTES de dividir

1. **577 MB de medios versionados en git.** El repo pesa 1.2 GB en limpio (`.git` 577 MB +
   `public/media` 577 MB, 473 archivos). Con tres repos, cada clon arrastra eso. **Sacarlos a
   Storage o a un CDN es tarea temprana**, no cosmética.
2. **El shim tiene que ser un paquete compartido** antes de copiarse. Si se copia y pega a tres
   repos, tendrás tres copias que divergen y tres verdades distintas sobre la misma base.
3. **La base no se puede reconstruir desde cero.** Las 19 migraciones fundacionales existen solo
   en el ledger, no como archivo (`supabase/migrations/APLICADAS.txt`). Con tres apps eso pasa de
   incómodo a peligroso.
4. **Repartir los 322 contratos.** Cuáles viajan con cada app y cuáles son del backend común.
5. **`sec_29` sin aplicar** — borrar una invitación se lleva en cascada el registro de quién entró.

---

## 7. SEO y dominios — dónde se pierde el posicionamiento

El sitio actual **ya está posicionado** y el dominio no se mueve. Aun así, la separación puede
romper SEO por descuido en tres puntos:

1. **`/portal` se muda a otro origen.** Esa ruta está enlazada desde el menú, así que es
   razonable suponer que Google la conoce. Al mudarla hay que dejar un **redirect 301** en la ruta
   vieja. Sin él: 404 y señales perdidas. **Comprobar antes qué hay indexado de verdad.**
2. **Hoy NO existe `robots.txt` ni `sitemap.xml`.** Verificado. Al separar hay que crear los dos:
   sitemap solo para la web pública, y `noindex` explícito para portal y CRM.
3. **El JSON-LD y las metaetiquetas viven en `index.html` del repo actual** — se quedan con la web
   pública, que es lo correcto. Ojo con duplicarlos por error en las otras dos.

Y el detalle que motivó todo esto: el auto-redirect de `src/pages/Home.jsx` (líneas 57-62) que
manda al portal a quien tenga sesión de cliente. **Es malo también para SEO**: si Googlebot no lo
dispara da igual, pero para un cliente que quiere ver la web pública es una trampa. Desaparece
con la separación.

---

## 8. El MCP — el punto más delicado del alcance

Un conector que registra pagos y modifica eventos necesita credenciales. El diseño importa más
que la funcionalidad:

- **No** puede llevar `service_role`: una fuga abriría todo el proyecto, Vero incluido.
- Debe hablar con **rutas del backend del CRM**, autenticadas con un token propio y con permisos
  acotados por acción. No directo contra Supabase.
- **Todas las operaciones auditadas**, con actor identificable. Ya existe la tabla.
- **El dinero tiene que ser un libro append-only**, nunca un campo mutable que se sobrescribe.
  Un anticipo es un asiento, no un número que se reemplaza. Esto hay que decidirlo **antes** de
  construir la parte de pagos, porque cambiarlo después implica migrar datos reales.

---

## 9. Orden de ejecución recomendado

```
0. DECIDIR (sin código)
   · dominios definitivos de portal y CRM
   · modelo de sesión entre apps · storageKey por app
   · el libro de pagos: forma del asiento
   · cómo se comparte el shim (paquete privado, submódulo, copia con contrato)

1. DEUDA PREVIA (en el repo actual, sin separar aún)
   · medios fuera de git
   · cerrar J-10 / J-11: policies por columna
   · aplicar sec_29
   · shim extraído como paquete

2. SEPARAR EL PORTAL DEL CLIENTE  ← primer corte, el menos acoplado
   · repo nuevo + subdominio + PWA (mudar manifest y sw)
   · 301 de /portal · noindex
   · quitar el auto-redirect de Home

3. TERMINAR PORTAL: invitados confirmados, mesas sobre plano, boletos QR

4. ACTIVAR LOS EVENTOS YA CONFIRMADOS   ← aquí empieza a pagar

5. SEPARAR CRM / PUNTO DE VENTA y extenderlo

6. WEB PÚBLICA COMPLETA + SEO (páginas por salón, servicios, FAQ)

7. MCP — al final: necesita que la API del CRM esté estable
```

**Regla que gobierna todos los pasos:** primero lo aditivo, luego se despliega, y **solo entonces**
se retira lo viejo. Es la misma regla de `docs/SEGURIDAD.md` §8.bis, y ya se rompió una vez:
revocar antes de desplegar tumbó el formulario público.

---

## 10. Riesgos, ordenados por lo que cuesta arreglarlos

| Riesgo | Por qué duele | Mitigación |
|---|---|---|
| Copiar el shim a tres repos | Tres verdades sobre la misma base; los bugs se arreglan una vez y siguen vivos dos veces | Paquete compartido **antes** del primer corte |
| Separar sin cerrar J-10/J-11 | La separación no protege los datos; solo la sesión | Cerrarlos en el paso 1 |
| Mover `/portal` sin 301 | Se pierden señales de un dominio ya posicionado | Redirect + comprobar qué está indexado |
| `service_role` en el MCP | Una fuga abre los cinco proyectos | Token acotado contra el backend del CRM |
| Pagos como campo mutable | Migrar dinero real después es lo más caro que hay | Libro append-only desde el diseño |
| Migraciones fundacionales sin archivo | No hay reconstrucción posible ante un desastre | Volcar el esquema (requiere visto bueno por Vero) |

---

## 11. Lo que queda abierto de antes

- **`sec_29`** — escrita, ensayada, sin aplicar.
- **Dos hallazgos de la auditoría del botón de WhatsApp**, confirmados por un refutador:
  1. Un teléfono de 11 dígitos que empieza por `1` se lee como EE. UU. La causa es que se
     descarta el `+` antes de decidir el país, y el `+` es lo único que distingue los dos casos.
  2. El texto plano del correo es forjable: los saltos de línea sobreviven al saneo, así que se
     puede inyectar un bloque «ESCRIBIRLE POR WHATSAPP» con otra URL. Solo afecta a `text/plain`.
- **La auditoría se quedó a medias**: 22 de 38 revisores no llegaron a correr por límite de cuota.
- **FASES 5–8** del bloque de calidad, sin empezar.
- **Solicitud de prueba `JCH-764279`** en el panel — se puede borrar.
