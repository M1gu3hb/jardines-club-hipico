# ECOSISTEMA.md — dónde estás y qué más existe

> Media página, **idéntica en los tres repositorios**. Si la editas en uno, edítala en los tres:
> está registrada en `scripts/compartidos.json` y un contrato lo comprueba.

## Hay TRES aplicaciones, no una

| App | Repo | URL | Qué es |
|---|---|---|---|
| **Web pública** | `M1gu3hb/jardines-club-hipico` | `jardines-club-hipico.vercel.app` | El sitio: salones, servicios, galería y el formulario de cotización |
| **Portal del cliente** | `M1gu3hb/JCH-portal-cliente` | `jch-portal-cliente.vercel.app` | PWA privada. El cliente organiza SU evento. La raíz `/` ES el portal |
| **CRM / punto de venta** | `M1gu3hb/JCH-CRM` | `jch-crm.vercel.app` | El panel de la casa, tras `ADMIN_SLUG`. La raíz `/` es 404 |

Nacieron de un solo repositorio, partido entre el 2026-08-23 y el 2026-08-24. El histórico
completo y las decisiones están en el **juego GENERAL**, que es canónico en
`jardines-club-hipico/docs/` y viaja copiado a `docs/general/` en los otros dos.

## UN SOLO Supabase, y no es solo nuestro

Las tres hablan con el **mismo** proyecto (`vuzyhbiwnnngeohysxcw`, schema `jardines`). No hay
tres bases: hay una. Un evento creado desde el CRM lo ve el portal en el mismo instante.

**Ese proyecto está compartido con OTRA aplicación distinta, Vero Seguros**, que vive en el
schema `public`. Vero no se toca nunca — ni sus tablas, ni su bucket `site-media`, ni la
configuración global de Auth. Lo único realmente compartido es `auth.users` (9 filas, y una es
el **único** administrador de Vero) y el trigger `on_auth_user_created`. El candado completo
está en `docs/SEGURIDAD.md`.

## Qué NO protege la separación

La frontera de datos es **RLS + el rol dentro del JWT**, no el dominio desde el que se cargó el
código: las tres usan la misma `anon key`, que es pública por diseño. Si RLS está mal, separar
no salva nada.

Lo que la separación sí da, y es real: **aislamiento de sesión** (orígenes distintos ⇒
`localStorage` distinto ⇒ un XSS en la web pública ya no puede leer la sesión de un admin) y
**superficie de código** (el bundle público pasó de 1073 KB —que incluía el panel entero y el
slug de su ruta— a 775 KB sin nada de eso).

## Código común

Se comparte **por copia**, registrada en `scripts/compartidos.json` con su `sha256` y un
contrato que la verifica. Editar un archivo común solo en un repo rompe la suite. El shim
(`src/api/base44Client.js`) es byte a byte idéntico en los tres; lo que cambia por app es
`src/api/funciones.js`, que declara las rutas de `api/` que esa aplicación tiene desplegadas.
