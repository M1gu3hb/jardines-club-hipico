# ESTADO.md — dónde está el proyecto, sin optimismo

> **2026-08-04** · <https://jardines-club-hipico.vercel.app>
>
> **El código que corre en producción es el commit `b1dbf69`** (PR #9), subido por el deployment
> `dpl_A1Ex55zgGErxznJJYFCNcYhEC5r6`. Los commits posteriores de `main` son **solo
> documentación** y no cambian una línea de código: el bundle servido sigue siendo
> `index-dCLt0o9K.js`. Este documento se ancla al commit de **código** a propósito — si citara el
> último deployment se quedaría obsoleto cada vez que se toca un `.md`.
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
| Commit del código | `b1dbf69` |
| Deployment que lo subió | `dpl_A1Ex55zgGErxznJJYFCNcYhEC5r6` (READY, target `production`) |
| URL | <https://jardines-club-hipico.vercel.app> |
| Funciones serverless | **8** |
| Migraciones aplicadas | `jardines_sec_01..25` (sin `sec_10`) |
| Contratos | 259/259 · typecheck 59 (línea base) · lint 0 |

**Bloques desplegados:** 1–8 completos. **El bloque 9 está en `main` y pendiente de que
Vercel lo despliegue**: hasta entonces, el formulario de alta sigue pidiendo 6 caracteres y
no existe el botón de convertir solicitudes.

**Verificado sin sesión tras el deploy:** las seis cabeceras de seguridad, `Cache-Control:
no-store` en las ocho rutas `api/`, que cada función responde 405 al método incorrecto y 401 sin
sesión, que las rutas por token no filtran si el token existe, que el bundle no lleva ningún
secreto (el único JWT es la `anon`, que es pública) y que `comprobante` tiene **0** apariciones.

---

## 3. Qué NO se ha hecho — lo importante

### 3.1 · 8A y 8D: cerrados en el bloque 9, pendientes de desplegar

- **8A** se mergeó en 9A (`5ccb032`). Cliente y servidor vuelven a validar lo mismo, importando
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

1. **El dueño sigue `docs/VALIDACION.md`**, empezando por la **Parte 0** (borrar los tres
   duplicados de «Boda ortega»), que es la primera ejecución real del borrado.
2. **Recuperar 8A**: rebasar `claude/jardines-bloque-8` sobre `main`, resolver el conflicto con
   8B/8C, PR y deploy.
3. **Decidir 8D** (`sec_25`) y **J-10/J-11** (RLS por columnas). Las dos son migraciones.
4. **Terminar la auditoría funcional.** Es lo único que puede decir cuánto falta de verdad.

---

## 6. ¿Se puede confiar en el panel hoy?

**Para mirar, sí. Para dar por bueno lo que no se ha revisado, no.**

Lo revisado a fondo está arreglado y protegido por 206 contratos que se validan mutando la
regresión real. Lo que se ha visto funcionar **con una persona delante** es casi nada: cero de los
cinco flujos, cero de las dos pantallas nuevas, y el borrado de eventos nunca ha corrido.
