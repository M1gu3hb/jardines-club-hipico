# ESTADO.md — dónde está el proyecto, sin optimismo

> **2026-08-04** · <https://jardines-club-hipico.vercel.app>
>
> **El código que corre en producción es el commit `1b0fb4f`** (PR #10), subido por el deployment
> `dpl_46GCBEcs83c7L5ksT6yZJxAH2fJ8`; el bundle servido es `assets/index-C_t9h3-r.js`. Este
> documento se ancla al commit de **código** a propósito — si citara el último deployment se
> quedaría obsoleto cada vez que se toca un `.md`.
>
> **El bloque 9F NO está en producción**: está en la rama `claude/jardines-security-hardening-rkse8k`,
> sin mergear. Lo de abajo describe lo desplegado, no lo escrito.
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
| Commit del código | `1b0fb4f` |
| Deployment que lo subió | `dpl_46GCBEcs83c7L5ksT6yZJxAH2fJ8` (READY, target `production`) |
| URL | <https://jardines-club-hipico.vercel.app> |
| Funciones serverless | **8** |
| Migraciones aplicadas | `jardines_sec_01..25` (sin `sec_10`) |
| Contratos | 270/270 · typecheck 59 (línea base) · lint 0 |

**Bloques desplegados:** 1–9 completos, 9E incluido. Ya está arriba el arreglo que impedía crear
dos eventos de la misma solicitud, el mínimo de contraseña unificado en 8, el botón de convertir
una solicitud en evento y la retirada de las imágenes que la CSP bloqueaba.

**El bloque 9F (G1–G4) está escrito y NO desplegado.** Es todo corrección de avisos y de
contratos: no cambia ninguna operación de datos.

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

1. **El dueño sigue `docs/VALIDACION.md`**, empezando por la **Parte 0** (borrar los tres
   duplicados de «Boda ortega»), que es la primera ejecución real del borrado. Ya se puede: el
   código que hace falta está en producción.
2. **Mergear y desplegar 9F.** No es urgente —no toca datos— pero mientras no suba, el aviso de
   "no sale ninguno" del desplegable de salones sigue pudiendo mentir en producción.
3. **Decidir `sec_26`** (único parcial sobre `eventos.solicitud_id`, recomendada y sin aplicar) y
   **J-10/J-11** (RLS por columnas). Las tres son migraciones.
4. **Terminar la auditoría funcional.** Es lo único que puede decir cuánto falta de verdad.

---

## 6. ¿Se puede confiar en el panel hoy?

**Para mirar, sí. Para dar por bueno lo que no se ha revisado, no.**

Lo revisado a fondo está arreglado y protegido por 270 contratos que se validan mutando la
regresión real — con la advertencia que dejó 9F: **de los 14 que añadió el bloque anterior, uno
no comprobaba lo que decía**, y solo se supo mutándolo. La cuenta de contratos mide trabajo, no
cobertura. Lo que se ha visto funcionar **con una persona delante** es casi nada: cero de los
cinco flujos, cero de las dos pantallas nuevas, y el borrado de eventos nunca ha corrido.
