# NEXT_STEPS.md — el sitio público

> Qué sigue en **esta** aplicación, ordenado por lo que de verdad bloquea. Lo que afecta al portal
> o al CRM está en sus repos; lo que afecta al proyecto entero, en `docs/NEXT_STEPS.md`.
>
> Escrito el **2026-08-24** sobre `9d0e053`.

---

## 0. LO QUE ESTÁ PENDIENTE DE UNA PERSONA

Cinco casillas. **Ninguna se puede marcar desde una sesión de código**: o exigen credenciales que
aquí no hay, o escribirían en producción. Van copiadas **literalmente**, tal y como las dictó el
dueño, porque pidió expresamente que quedaran escritas:

```
- El CRM muestra los 2 eventos y las 13 solicitudes: sin comprobar (necesita su login).
- Un cliente entra al portal nuevo: sin comprobar (necesita credenciales de cliente).
- Un enlace de primer acceso recien emitido: sin comprobar (crearia un usuario, prohibido).
- El formulario publico crea solicitud y manda correo tras la FASE 4: sin comprobar (escribe
  en produccion; el dueno pidio saltarla).
- El administrador de Vero entra a su aplicacion: sin comprobar.
```

Las cinco **casillas** son las mismas en los tres repositorios, pero la redacción NO es idéntica: aquí van en prosa, en el CRM como tabla y en el portal como lista de comprobación. Se dice para que nadie las compare byte a byte y crea que divergieron. **No se dan por buenas.**

### La cuarta es la de ESTA aplicación

«El formulario público crea solicitud y manda correo tras la FASE 4» es el **único flujo de
escritura** del sitio, y el único que no tiene más red que los contratos estáticos. Procedimiento,
para cuando alguien decida hacerlo:

1. Abrir <https://jardines-club-hipico.vercel.app> y llenar el formulario con datos claramente de
   prueba (nombre reconocible, teléfono real de quien prueba, comentario que diga «PRUEBA»).
2. Comprobar en la pantalla que sale un **folio** con forma `JCH-XXXXXX`. Si no sale folio, el
   registro **no** ocurrió y el error es real, no cosmético.
3. Comprobar que llega el correo al buzón del dueño, y que el folio del correo **es el mismo** que
   el de la pantalla. Que coincidan es exactamente lo que se arregló, así que es lo que hay que
   mirar.
4. Comprobar que el botón «Escribir por WhatsApp» aparece y abre el chat del número que se puso.
   Si el teléfono se escribió raro a propósito, comprobar que el botón **no** aparece y que en su
   lugar sale la nota de que el número no tiene forma de número.
5. Después, borrar la solicitud de prueba desde el CRM.

**Escribe en producción.** No lo hagas sin decírselo al dueño.

---

## 1. Urgente — nada

No hay nada roto que bloquee el uso del sitio. Las cuatro puertas pasan y el bundle está separado.
Lo urgente de verdad es la casilla 4 de arriba, y no depende de código.

---

## 2. Importante — arreglar cuando alguien vuelva a tocar el repo

### 2.1 `README.md` está desactualizado y es el primer archivo que abre alguien nuevo

Sigue describiendo el monolito: «panel de administración y portal del cliente» y «7 funciones
serverless en `api/`». Después de la FASE 6 hay **una**. Es media hora de trabajo y evita que la
siguiente persona busque durante un rato algo que ya no está aquí.

### 2.2 J-04 — el dominio de `index.html`

`og:url` y los dos bloques JSON-LD (y el `image` del `EventVenue`) apuntan a
`jardinesclubhipico.com`, que no es el dominio servido. **Se resuelve solo al conectar el dominio
propio**; hasta entonces, lo que hay es una decisión: dejarlo apuntando al dominio futuro (hoy
falso) o al de Vercel (mañana falso). Está sin decidir a propósito. Ver `docs/app/BUGS_PENDING.md`.

### 2.3 La prop muerta `correoAdmin`

`src/pages/Home.jsx` le pasa `correoAdmin` a `FormularioModal`, que no la declara ni la usa. Es
uno de los nueve errores de la línea base de typecheck. Quitarla **baja la línea base a 8**, y eso
hay que actualizarlo en `docs/app/CLAUDE.md` y `docs/app/ESTADO.md` a la vez.

### 2.4 `public/manifest.webmanifest` es del portal

`start_url: "/portal"`. Sobrevivió a la separación y este sitio no lo enlaza (`index.html` apunta
a `manifest.json`). Borrarlo es seguro, pero **comprueba primero** que el portal ya tiene el suyo
en su repo — es un archivo, no una copia registrada en `compartidos.json`.

---

## 3. Después — deuda que no corre prisa

### 3.1 Cerrar J-16: las dos RPC concedidas a `anon`

`registrar_llegada_mesa` e `info_mesa_token` son invocables sin sesión y ningún código las llama.
Retirarlas es una migración (`revoke execute ... from anon`) y **hay que hacerla en el orden
correcto**: comprobar **a mano** que el CRM y el portal tampoco las usan, con un `grep` en cada
repositorio, antes de tocar la base.

**Y hay que decirlo así porque aquí no hay contrato que lo vigile.** De las siete RPC huérfanas,
seis no aparecen **ni una vez** en `scripts/test-contratos-api.mjs`, y la séptima
(`revocar_staff_token`) solo sale en un comentario en prosa de la línea 274, que no afirma nada.
Ese contrato se fue con la FASE 6.
El juego general todavía lo da por vivo. Si al retirarlas se rompe algo en otra app, **se sabrá
en producción, no en `npm run test:contratos`.**

### 3.2 Decidir sobre `sec_29`

Escrita, ensayada en un bloque revertido por construcción, **sin aplicar**. Dos contratos la
vigilan y comprueban que siga figurando como pendiente. Es una decisión del dueño, no técnica.

### 3.3 Ampliar el alcance de lint y typecheck

Hoy `src/App.jsx` y `src/main.jsx` **no se lintean** (ESLint dice literalmente «File ignored
because no matching configuration was supplied») y `api/` **no se typechequea**. No es urgente
porque los contratos cubren lo importante de `api/`, pero es una red que parece estar y no está.
Detalle y comprobación en `docs/app/FILE_MAP.md`, nota final.

### 3.4 J-03 — decidir si el sitio debe degradar con contenido

Hoy, sin Supabase, las secciones dinámicas salen vacías. Las opciones son tres y no son
equivalentes: dejarlo así (honesto, y es lo que hay), poner un mensaje explícito de «no se pudo
cargar» en cada sección, o volver a conectar un respaldo estático. **Lo que no se debe hacer es
inventar datos**: eso ya se hizo, y salían cinco salones que no existen y un teléfono que no era
el del negocio. Por eso existen los contratos 1.4 y 1.5.

---

## 4. Ideas, no compromisos

- Partir el bundle (775 kB en un solo chunk). `framer-motion`, `gsap` y `three` son los
  candidatos obvios a carga diferida.
- Borrar del repo las **46** primitivas de `ui/` que no se usan. En `src/components/ui/` hay
  **49** archivos y solo **tres** llegan al bundle: `App.jsx` importa `toaster.jsx`, y ese arrastra
  `toast.jsx` y `use-toast.jsx`. Las otras 46 no las importa nadie fuera de `ui/`. Ojo: **esas tres
  son código común** registrado en `compartidos.json`, así que no se tocan sin pasar por el
  manifiesto. Y Vite ya hace tree-shaking, así que esto es higiene del repo más que peso — conviene
  medir antes de afirmar que recorta kilobytes.
- Extraer el código común a un paquete de verdad, en vez de compartirlo por copia. Es la solución
  real al límite que `scripts/compartidos.json` declara de sí mismo: hoy solo detecta una edición
  local, no una divergencia remota.
- `script-src 'unsafe-inline'` en la CSP. Quitarlo exige nonces por petición.

---

## 5. Sobre la red de pruebas

La suite de contratos **no ejecuta la aplicación**: es análisis estático más unas pocas funciones
puras. No hay pruebas unitarias, ni de integración, ni end-to-end. Antes de escribir un contrato
nuevo, lee `docs/app/CONTRATOS.md` §«qué NO cubre» y la regla de `docs/app/CLAUDE.md` §8 — un
contrato mal atado es peor que no tenerlo, porque afirma en su nombre una propiedad que ya no se
cumple.
