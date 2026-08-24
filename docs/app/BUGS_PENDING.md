# BUGS_PENDING.md — lo que le toca al sitio público

> Los identificadores `J-##` son del **registro común** del proyecto (`docs/BUGS_PENDING.md`), que
> cubre las tres aplicaciones. Aquí solo están los que tocan a **esta**, con lo que se puede
> comprobar **en este repositorio**, y con lo que no se puede dicho como tal.
>
> Revisado el **2026-08-24** sobre `9d0e053`. Cada afirmación de más abajo está contrastada con un
> archivo de este repo; donde depende del estado de la base, lo digo — **no tengo conexión a
> Postgres desde aquí**.

---

## Estado general

**No hay bugs críticos abiertos en esta aplicación.** El P0 del proyecto (J-14, la invitación
digital) es del portal y aquí no existe. Lo que queda son **cinco entradas** —los cinco
encabezados de «Abiertos» de más abajo—: dos propias del sitio público (J-03 y J-04), una que aquí
casi no muerde (J-02/J-15), una de superficie (J-16), y una de la base compartida que este origen
no puede disparar (J-10/J-11).

Cinco entradas, **siete identificadores**: J-02/J-15 y J-10/J-11 comparten encabezado porque son
la misma causa contada dos veces en el registro común. `docs/app/ESTADO.md` §7 los tabula igual,
en cinco filas.

Lo que **sí** debería preocupar más que cualquiera de ellas: el único flujo de escritura del sitio
—el formulario— **no se ha ejercitado a mano desde la FASE 4**. Ver `docs/app/NEXT_STEPS.md`.

---

## Abiertos

### J-03 — Si Supabase no responde, el sitio se renderiza vacío

- **Impacto:** alto si ocurre; probabilidad baja. Espacios, galería, servicios, amenidades y la
  configuración del sitio se pintan **vacíos**. Sobreviven el hero, los 241 frames de la animación
  y el bloque de Confianza, porque salen de archivos locales.
- **Causa, y es una corrección de documentación tanto como un bug:** `src/data/site-data.json` se
  documentó durante meses como «fallback estático» y **nunca se conectó**. Comprobado hoy con
  `grep -rn "site-data" src/ api/`: **cero** apariciones en `src/` y en `api/`; sus únicos lectores
  son `scripts/build-media.mjs` (que lo escribe), `scripts/seed-supabase.mjs` y `scripts/montage.mjs`.
- **Lo que sí se hizo, y no es lo mismo:** el sitio ya **arranca** aunque la base no conteste
  (plazo de 2.5 s en `Home.jsx`, contrato 3.1) y los respaldos **dejaron de inventar** — sin
  configuración, el contacto sale de `src/config/negocio.js`, que son datos verificados, y los
  salones dicen que la lista no cargó en vez de enseñar cinco inventados (contratos 1.4 y 1.5).
  Arrancar vacío es honesto; arrancar con datos falsos era peor.
- **Archivos:** `src/api/base44Client.js` (no tiene rama de degradación), `src/data/site-data.json`.
- **Prioridad:** baja. **Estado:** abierto. **No es una regresión: nunca existió.**

### J-04 — `og:url` y los dos JSON-LD apuntan a un dominio que no es el servido

- **Impacto:** bajo. SEO y cómo se ve el sitio al compartirlo.
- **Comprobado hoy** en `index.html`: son **tres** valores, todos `https://jardinesclubhipico.com/`
  — el `og:url`, el `url` del bloque `WebSite` y el `url` del bloque `EventVenue`. Hay un cuarto
  sitio con el mismo dominio: el `image` del `EventVenue`. El sitio se sirve hoy en
  `jardines-club-hipico.vercel.app`.
- **Causa:** el `index.html` se escribió antes de conectar el dominio propio.
- **Ojo con el hermano que ya se cerró:** J-01 era lo mismo en los correos (`SITIO_URL` escrita a
  mano) y **está resuelto**: `api/_lib/urls.js` lee `URL_WEB`, `URL_PORTAL` y `URL_CRM` del
  entorno. Aquí no, porque un `index.html` estático no lee variables en runtime — habría que
  inyectarlas en el build o poner el dominio definitivo.
- **Archivos:** `index.html`.
- **Prioridad:** baja mientras no haya dominio propio; **sube en cuanto se conecte**, porque
  entonces el que estará mal será el otro. **Estado:** abierto.

### J-02 / J-15 — El shim da por buena una escritura que RLS dejó en cero filas

- **Qué es:** `update()` y `delete()` de `src/api/base44Client.js` devuelven éxito cuando la base
  no tocó ninguna fila. `update` hace `rowToObj(data) || { id, ...patch }`, o sea **fabrica** el
  objeto que parece guardado; `delete` devuelve `{ success: true }` incondicionalmente. Un UPDATE
  o un DELETE denegados por RLS no dan error: dan **cero filas**.
- **Por qué aquí casi no muerde, dicho con precisión:** esta aplicación **no llama a `update` ni a
  `delete` ni una sola vez** — comprobado con `grep` de `entities.` sobre `src/` excluyendo
  `src/api/`: salen diez líneas, y ninguna es una escritura salvo el `create` del formulario. Y
  ese `create` es justamente el camino que **sí** comprueba: para `solicitudes` el shim desvía a la
  RPC, propaga el error si lo hay, y el componente exige folio (`if (!creada?.folio) throw`).
- **Por qué sigue listado igual:** el código viaja en el bundle porque el shim es común byte a byte
  con el portal y el CRM, donde sí muerde. De aquí salió el P0 del portal. Si algún día se añade
  una escritura a este sitio, hay que usar `updateEstricto` / `deleteEstricto`, que sí lanzan.
- **Archivos:** `src/api/base44Client.js`.
- **Prioridad:** media en el proyecto; **baja en esta app**. **Estado:** abierto (la mitad de
  lectura se cerró con `filterEstricto` / `listEstricto`; la de escritura no).

### J-16 — Dos RPC concedidas a `anon` que nadie invoca

- **Qué es:** de las siete RPC huérfanas del registro común, **dos están concedidas a `anon`** —
  el rol con el que habla este sitio— y por tanto son invocables **sin autenticarse** desde
  cualquier navegador:

  | Función | Por qué importa |
  |---|---|
  | `registrar_llegada_mesa(text, text, integer)` | Escribiría `mesas.ocupadas`, la fuente que el tablero de meseros lee y **nadie llena**. La más urgente de las siete |
  | `info_mesa_token(text, text)` | `sec_23` la conservó como «la vía viva y protegida», pero la interfaz nunca llegó a usarla |

- **Comprobado en este repo:** las dos se definen en `sec_04` y `sec_06` las incluye en el bloque
  «RPC realmente públicas», con `revoke all ... from public` + `grant execute ... to anon,
  authenticated`. Las dos validan token y aplican rate limit; no son un agujero abierto, son
  superficie que nadie usa.
- **Las otras cinco** (`revocar_staff_token`, `confirmar_evento`, `auditoria_reciente`,
  `operativo_ubicar`, `operativo_evento_activo`) no están concedidas a `anon` y no le tocan a esta
  app.
- **Estado:** abierto, **y sin red debajo en este repositorio.** El juego general
  (`docs/BUGS_PENDING.md`) dice que hay una lista explícita en el contrato para que cualquier
  huérfana nueva rompa la suite; ese contrato **se fue con la FASE 6 y aquí ya no existe.**
  Comprobado: `grep -n "registrar_llegada_mesa\|info_mesa_token\|confirmar_evento\|auditoria_reciente\|operativo_ubicar\|operativo_evento_activo" scripts/test-contratos-api.mjs`
  devuelve **cero** coincidencias — seis de las siete. La séptima, `revocar_staff_token`, sale una
  vez, en un comentario en prosa de la línea 274, que no afirma nada. Ninguno de los 59 contratos
  habla de RPC huérfanas: el identificador `huerfanos` que sí vive en la suite es del contrato 1.1
  y va de **prefijos de migración**, no de funciones. Si alguien concede otra RPC a `anon`,
  **nada aquí se pondrá rojo**; lo único que lo sostiene es que estas dos entradas se lean.

### J-10 / J-11 — Policies de la base compartida que este origen no puede disparar

Se anotan porque las migraciones viven en **este** repositorio, no porque el sitio las use.

- **J-10:** las policies de `jardines` autorizan **la fila entera**, no columnas. `eventos_upd`
  (`sec_09`) es `using (jardines.is_admin()) with check (jardines.is_admin())`, así que un admin
  puede escribir `auth_user_id` desde el navegador. El **uso peligroso** está cerrado en código;
  el permiso sigue abierto. `sec_27` avanzó en permisos por columna.
- **J-11:** `eventos_del` permite borrar un evento desde el navegador, saltándose el orden que
  `api/eliminar-evento.js` garantizaba — y esa ruta ya **no vive aquí**, se fue al CRM.
- **Por qué no se disparan desde el sitio público:** las dos exigen `jardines.is_admin()`, y
  `anon` no lo es. Un visitante que llame `base44.entities.Evento.delete(id)` desde la consola
  recibe un error de RLS.
- **Por qué no se arreglan aquí:** cambiar una policy de producción compartida exige migración y
  el orden de despliegue de §7 de `docs/app/SEGURIDAD.md`. **Estado:** abiertos, documentados.

---

## Cerrados que conviene no reabrir

### J-12 — Imágenes de Unsplash que la CSP bloquea *(resuelto en 9D)*

Las **catorce** referencias se auto-hospedaron desde `public/media/img/`. **Comprobado hoy:**
`grep -rn "unsplash\|imgur" src/ index.html vercel.json` no devuelve **ni una sola URL** — solo
cinco comentarios que explican por qué se quitaron, en `CtaCotizacion.jsx`, `GaleriaSection.jsx`,
`SalonesSection.jsx` y `SalonOverlay.jsx`. La CSP **no se ensanchó**, y hay un contrato (9D) que
impide hacerlo después.

### J-01 — `SITIO_URL` escrita a mano *(cerrado en la FASE 4)*

`api/_lib/urls.js` declara `URL_WEB`, `URL_PORTAL`, `URL_CRM` y `RUTA_PANEL`, cada una desde su
variable de entorno, con el dominio de la web como paracaídas. `correo.js` las re-exporta para no
tocar los `import` que ya existían. Dos contratos lo vigilan («las tres URL se declaran UNA vez»,
«ningún correo añade ya el sufijo `/portal`»).

---

## No son bugs, pero están aquí y alguien los va a encontrar

| Cosa | Qué pasa |
|---|---|
| `README.md` desactualizado | Sigue diciendo «panel de administración y portal del cliente» y «7 funciones serverless en `api/`». Después de la FASE 6 hay **una**. Es el primer archivo que abre alguien nuevo |
| `public/manifest.webmanifest` | Es el manifiesto del **portal** (`start_url: "/portal"`) y sobrevivió a la separación. `index.html` enlaza `manifest.json`, no este. Candidato a limpieza |
| `correoAdmin` en `Home.jsx` | Se le pasa a `FormularioModal`, que **no lo declara**. Es uno de los nueve errores de typecheck y es una prop muerta |
| Las 19 entidades del shim que esta app no usa | Deliberado: el núcleo del shim es común byte a byte. No dan ningún permiso — `anon` no llega a esas tablas — pero son superficie |
| `src/App.jsx` y `src/main.jsx` no se lintean | Ningún bloque de `eslint.config.js` los cubre; ESLint responde literalmente «File ignored because no matching configuration was supplied». Comprobado ejecutándolo |
| `api/` no se typecheca | No está en el `include` de `jsconfig.json`. Lo cubren los contratos, no `tsc` |

---

## Lo que este documento NO puede afirmar

- Que la base esté hoy exactamente como dicen las migraciones. `APLICADAS.txt` es una copia del
  ledger mantenida a mano; el contrato 1.1 comprueba que coincida con los **nombres de archivo**,
  no con Postgres.
- Que el formulario funcione hoy de punta a punta. Nadie lo ha llenado desde la FASE 4.
- Nada sobre el portal ni el CRM: sus bugs están en sus repos.
