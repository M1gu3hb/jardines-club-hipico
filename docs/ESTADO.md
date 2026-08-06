# ESTADO.md — dónde está el proyecto, sin optimismo

> **2026-08-06** · <https://jardines-club-hipico.vercel.app>
>
> **El código que corre en producción es el commit `8f7fe29`**, subido por el deployment
> `dpl_7D3FpUnghgCcPKPAc2uaU1Ss6zoD` (READY, target `production`); el bundle servido es
> `assets/index-DRaB7TwK.js`. Este documento se ancla al commit de **código** a propósito — si
> citara el último deployment se quedaría obsoleto cada vez que se toca un `.md`.
>
> **Desplegadas las FASES 0–4** del bloque final, además del video temporal del hero:
> el teléfono del negocio en el JSON-LD, los respaldos que inventaban salones y datos de
> contacto, la galería y el PDF del menú (que no funcionaban nunca), las dos cajas muertas del
> panel, la página en blanco (plazo + error boundary), y los mensajes de la puerta que eran
> inalcanzables. Verificado contra la URL de producción, no supuesto.
>
> **⚠️ NADIE HA CLICADO ESTO A MANO.** Pasa lint 0, build limpio, 314/314 contratos y typecheck en
> línea base, y los marcadores de cada fase están comprobados en el bundle servido — pero no ha
> habido validación humana con credenciales reales.
>
> **Base de datos:** `sec_26`, `sec_27` y `sec_28` **se aplicaron el 2026-08-05** con el visto
> bueno del dueño (ver `APLICADAS.txt`), así que la invitación digital ya guarda, el tablero de
> meseros lee de `invitaciones` —y su aviso provisional se apagó solo— y el bucket `sitio` admite
> PDF. La única migración pendiente es **`sec_29`** (que el libro de entradas sobreviva al borrado
> de una invitación): escrita, ensayada en un bloque revertido por construcción, y **sin aplicar**
> a la espera de decisión.
>
> **Sin empezar:** FASES 5–8 del bloque final (las 36 escrituras sin `catch`, el aviso de
> privacidad y los correos, la limpieza de contratos y código muerto, y la documentación).
>
> **TEMPORAL — video del hero.** El hero enseña un único video vertical
> («Style Contest 2026», `public/media/img/style-contest-2026.mp4`) en lugar de los dos de
> siempre. Es a petición del dueño y se quita poniendo `activo: false` en
> `src/config/heroTemporal.js` y volviendo a desplegar: el carrusel de los dos videos sigue
> entero en el código y vuelve solo. No hay nada más que deshacer.
>
> Este documento existe para responder tres cosas de un vistazo: **qué está hecho**, **qué está en
> producción** y **qué queda abierto**. Si algo de aquí contradice a otro documento, gana este.
> El detalle histórico está en `docs/CHANGELOG.md`; los bugs, en `docs/BUGS_PENDING.md`.

---

## 1. En una frase

El sitio y el panel funcionan y están desplegados; el blindaje de seguridad está hecho y
verificado por código, **pero no está validado por una persona con credenciales reales**, y
**la mayor parte del producto nunca se ha auditado funcionalmente**. Lo que se ha revisado a
fondo salió con un P0 cada vez.

---

## 2. Qué está en producción

| | |
|---|---|
| Commit del código | `4a78f94` |
| Deployment que lo subió | `dpl_Hco4QLZNCwtYYrQ7xZSUmdCesFKG` (READY, target `production`) |
| URL | <https://jardines-club-hipico.vercel.app> |
| Funciones serverless | **8** |
| Migraciones aplicadas | `jardines_sec_01..25` (sin `sec_10`) |
| Contratos | 290/290 · typecheck 59 (línea base) · lint 0 |

**Bloques desplegados:** 1–9 completos, 9E incluido. Ya está arriba el arreglo que impedía crear
dos eventos de la misma solicitud, el mínimo de contraseña unificado en 8, el botón de convertir
una solicitud en evento y la retirada de las imágenes que la CSP bloqueaba.

**Los tres duplicados de «Boda ortega» están borrados** — la primera ejecución real de
`api/eliminar-evento.js` con `service_role`, y salió limpia: 0 huérfanos en las 14 tablas que
cuelgan de `eventos`, 0 objetos huérfanos en el bucket, 0 perfiles sin usuario, el admin de Vero
intacto, y los 2 usuarios de portal vivos casan con los 2 eventos que quedan.

**La FASE A del bloque de cierre está escrita y NO desplegada**, y con ella el arreglo del P0 de
la invitación. Mientras no suba, el cliente sigue viendo «Guardado ✓» sin haber guardado nada.

### 2.bis · Tres funciones que no han funcionado NUNCA

Salieron de la auditoría de las siete zonas. Las tres fallan en silencio, y esa es la razón de
que lleven meses así:

| Función | Por qué |
|---|---|
| **La invitación digital del cliente** | `eventos_upd` exige `is_admin()`; el portal es rol `cliente`. `count(invitacion_token)` = **0**. Corregido en fase A para que deje de mentir; que llegue a funcionar exige `sec_26`, sin aplicar |
| **Subir a la galería** | `orden: Date.now()` desborda un `integer` (×800). Las 69 filas de `galeria` tienen `orden` 1–69: la semilla. Ninguna se subió nunca desde el panel. **Sin arreglar** (fase B) |
| **El PDF del menú** | el bucket `sitio` no admite `application/pdf`. **Sin arreglar** (fase B) |

**Verificado sin sesión tras el deploy:** las seis cabeceras de seguridad, `Cache-Control:
no-store` en las ocho rutas `api/`, que cada función responde 405 al método incorrecto y 401 sin
sesión, que las rutas por token no filtran si el token existe, que el bundle no lleva ningún
secreto (el único JWT es la `anon`, que es pública), que `comprobante` tiene **0** apariciones,
que no queda ni una referencia a `images.unsplash.com`, `imgur`, `base44` ni `cloudfront`, y que
`PASSWORD_MIN = 8` está en el bundle servido.

---

## 3. Qué NO se ha hecho — lo importante

### 3.1 · 8A y 8D: cerrados y desplegados

- **8A** se mergeó en 9A (`5ccb032`) y está en producción desde `1b0fb4f`. Cliente y servidor vuelven a validar lo mismo, importando
  las reglas del mismo archivo. Los conflictos fueron **tres**, no nueve, y se resolvieron con
  `main` de base. La autoauditoría encontró además un falso negativo residual del propio arreglo
  de 8A y se cerró.
- **8D** existe desde 9B (`sec_25`) y 9C: se puede convertir una solicitud en evento con los datos
  puestos, y el rastro queda en `eventos.solicitud_id`.

> Este documento y `PROJECT_CONTEXT.md` llegaron a afirmar que 8A estaba en `main` cuando no lo
> estaba. **Era falso**, y venía arrastrándose de un resumen anterior sin que nadie lo
> comprobara. Se detectó mirando `git`, no leyendo documentación. Conviene recordarlo.

### 3.3 · J-10 y J-11: el permiso de RLS sigue abierto

Las policies de `jardines` conceden **la fila entera**, no columnas. Consecuencia directa:
`eventos.auth_user_id` y `documentos.archivo_url` —las dos entradas de las operaciones
destructivas— **las escribe cualquier admin desde el navegador**. De ahí salió el P0 de 8F.

- **El uso peligroso está cerrado en código:** ningún dato de esas columnas destruye nada sin
  comprobar antes a quién pertenece.
- **El permiso no está cerrado.** Sigue siendo posible escribir esas columnas.
- Además, `eventos_del` permite borrar un evento desde el navegador, así que el orden
  «archivos primero» del endpoint es **convención, no garantía** (J-11).

Cerrarlos exige migración **y** respetar el orden de `docs/SEGURIDAD.md` §8.bis: lo aditivo
primero, lo restrictivo **después** de que el sustituto esté desplegado y validado. Revocar antes
de desplegar ya rompió el formulario público una vez.

### 3.4 · La auditoría funcional está sin hacer casi entera

`docs/AUDITORIA-FUNCIONAL.md` cubrió **~1,5 zonas de 7** y en ese trozo encontró **1 P0 y 2 P1**.
Sin barrer:

- el resto del sitio público,
- **casi todo el panel**,
- **el portal del cliente entero**,
- **tres de las cuatro vistas por token** (mesa, invitación, staff),
- **los siete correos**,
- **las siete rutas `api/`** (ahora ocho).

Con la densidad de hallazgos que dio la parte revisada, **lo que falta no va a salir limpio**.
Asumir lo contrario sería el mismo error que dar 8A por mergeado.

### 3.5 · Lo que nunca se ha ejercitado de verdad

| Qué | Estado |
|---|---|
| El endpoint de borrado (`api/eliminar-evento`) con `service_role` real | **Nunca se ha ejecutado.** Su lógica está probada pieza a pieza y en `BEGIN/ROLLBACK`, pero jamás ha corrido contra la base. La primera vez será cuando el dueño borre los duplicados (Parte 0 de `docs/VALIDACION.md`) |
| Las pantallas nuevas en un navegador | **Nunca.** Ni `EventoEliminar` ni los estados de carga se han visto renderizados: en esta sesión Chromium no atraviesa el proxy |
| Los cinco flujos con credenciales reales | **Nunca.** Es lo que impide declarar cerrado el blindaje |
| El botón «Avisar» | Llevaba meses devolviendo 400 por una columna inexistente. Arreglado, **pero nadie ha visto llegar el correo** |

---

## 4. Deuda viva

| Id | Qué | Prioridad |
|---|---|---|
| **J-10** | Las policies no restringen columnas; `auth_user_id` y `archivo_url` son escribibles desde el navegador. Uso cerrado, permiso no | **Media-alta** |
| **J-11** | `eventos_del` permite borrar eventos saltándose el endpoint | Media |
| **J-01** | `SITIO_URL` hardcodeada al dominio de Vercel: todos los correos enlazan ahí | Media |
| **J-02** | El shim reporta éxito en escrituras que RLS dejó en 0 filas. **La mitad de lectura se cerró en 8E**; la de escritura sigue abierta | Media |
| **J-06** | El guardarraíl del operativo es solo de cliente | Media |
| **J-03** | No hay fallback si Supabase no responde: el sitio se renderiza vacío | Media |
| **J-07** | `operativo_activo` no se maneja desde el panel; hoy hay 0 eventos con él | Baja |
| **J-04** | `og:url` y JSON-LD con dominio placeholder | Baja |
| **J-05** | El cliente no puede cambiar su contraseña desde el portal | Baja |
| **J-13** | `eventos.solicitud_id` no es único: dos admins a la vez podrían duplicar una conversión. El camino reproducible está cerrado en código; la carrera no | Baja |
| **D-COD-2** | Los tokens de mesa, invitación y staff se guardan **en claro** | Decisión pendiente |

**Riesgos residuales aceptados y documentados** (no son bugs): los tokens son credenciales
portadoras por diseño, `operativo_canales` es global y no por evento, y la CSP conserva
`'unsafe-inline'`. Detalle en `docs/BUGS_PENDING.md`.

---

## 5. Qué hacer a continuación, por orden

1. **El dueño decide sobre `sec_26` y `sec_27`.** Son las dos migraciones escritas, ensayadas y
   sin aplicar. Están en la tabla de `docs/VALIDACION.md`, en lenguaje llano.
2. **El censo dejó 63 hallazgos abiertos** (5 P0, 15 P1, 24 P2, 19 P3) y de ellos se cerraron
   los tres P0 de infraestructura (1.1, 1.2, 1.3). **Quedan 1.4 y 1.5** —la página en blanco si
   Supabase no contesta, y la familia de nueve respaldos que inventan datos— y las fases 2 a 7.
3. **Terminar la auditoría funcional en el navegador.** Nada de esto se ha visto renderizado:
   Chromium no atraviesa el proxy en estas sesiones.

---

## 6. ¿Se puede confiar en el panel hoy?

**Para mirar, sí. Para dar por bueno lo que no se ha revisado, no.**

Lo revisado a fondo está arreglado y protegido por 270 contratos que se validan mutando la
regresión real — con la advertencia que dejó 9F: **de los 14 que añadió el bloque anterior, uno
no comprobaba lo que decía**, y solo se supo mutándolo. La cuenta de contratos mide trabajo, no
cobertura. Lo que se ha visto funcionar **con una persona delante** es casi nada: cero de los
cinco flujos, cero de las dos pantallas nuevas, y el borrado de eventos nunca ha corrido.
