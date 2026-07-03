# DATABASE.md

## Resumen

**No hay base de datos en vivo.** El proyecto es estático. El "modelo de datos" son las entidades
que existían en Base44, ahora **congeladas** en `src/data/site-data.json` (generado desde
`scripts/raw/*.json`). El panel `/Admin` opera sobre un **store en memoria** (shim) que no persiste.

Si en el futuro se quisiera un backend real (p. ej. Supabase), estas entidades son el esquema de
referencia. Los IDs conservados son los ObjectId originales de Base44.

## Entidades / modelos

### ConfigSitio  (`site-data.json` → `config`, 1 registro)
- **Propósito:** configuración global del sitio.
- **Campos clave:** `logoUrl`, `telefonoContacto`, `whatsappNumero` (solo dígitos, ej. `525548663656`),
  `correoAdmin`, `ubicacionTexto`, `ubicacionLinkMapa`, `informacionServicios` (texto de la sección
  "Avisos"), `textoNoIncluye` (histórico, no se muestra), `proximamenteActivo`/`proximamenteImagenUrl`/
  `proximamenteTitulo`/`proximamenteDescripcion`/`proximamenteTextoBoton` (cartel del hero),
  `colorPrimario`/`colorSecundario`.
- **Se usa en:** `Home.jsx` (pasa props a Hero, Contacto, NoIncluye, WhatsApp).
- **Reglas:** `whatsappNumero` sin `+` ni espacios. Si `proximamenteActivo=false`, no se muestra el cartel.

### Salon  (`config` → `salones`, 8 registros)
- **Propósito:** espacios para eventos.
- **Campos:** `nombre`, `descripcion` (card), `descripcionLarga` (overlay), `capacidad` (texto),
  `capacidadMin/Max`, `imagenPrincipal`, `imagenes[]`, `caracteristicas[]`, `activo`, `orden`, `id`.
- **Se usa en:** `SalonesSection`, `SalonOverlay`, `SalonGallery`, `FormularioModal` (lista de espacios).
- **Reglas:** orden 1..8 controla la aparición. `activo=false` lo oculta.

### Galeria  (`galeria`, 69 registros)
- **Propósito:** galería de fotos/videos de eventos.
- **Campos:** `imagenUrl` (imagen o `.mp4`).
- **Se usa en:** `GaleriaSection`. **Orden = orden del arreglo** (Home usa `Galeria.list()`).

### ServicioItem  (`servicios`, 14 registros)
- **Propósito:** servicios que ofrece el lugar.
- **Campos:** `titulo`, `descripcion` (se muestra al EXPANDIR la tarjeta), `imagenUrl`, `imagenesUrl[]`, `activo`, `id`.
- **Se usa en:** `ServiciosAmenidades` → `ServiceAmenityCard`.

### AmenidadItem  (`amenidades`, 15 registros)
- Igual estructura que `ServicioItem`. Se usa en `ServiciosAmenidades` y como extras en `FormularioModal`.

### ServicioExtra  (`serviciosExtra`, 11 registros)
- **Propósito:** opciones de servicios extra (checkboxes históricos del formulario largo). Con el
  formulario corto actual **casi no se usan**, pero se conservan en los datos.
- **Campos:** `nombre`, `categoria`, `descripcion`, `aplicaA`, `activo`.

### AlimentoMenu  (`alimentos`, 3 registros)
- **Propósito:** menús de alimentos. **Campos:** `nombre`, `descripcion`, `pdfUrl` (Google Drive), `activo`.

### SolicitudEvento  (no se almacena)
- **Propósito:** solicitudes del formulario. En la versión estática **no se guardan**; se envían por
  correo (`api/solicitud.js`). El shim las "crea" solo para generar el folio. Campos que viajan en el
  correo: `folio, fechaEnvio, horaEnvio, nombreCompleto, telefono, email, salonSeleccionado, tipoEvento,
  fechaTentativa, numeroPersonas, comentarios`.

### resenas  (`src/data/resenas.json`)
- **Propósito:** bloque de Confianza. **Campos:** `rating` (4.2), `googleUrl`, `stats[]` (número + label),
  `resenas[]` (`{autor, texto, estrellas, evento}`). El carrusel solo aparece si `resenas[]` tiene items.

### User  (built-in de Base44, no se usa)

## Migraciones
No aplica (sin base de datos). Historial de contenido = git de `scripts/raw/*.json` + `site-data.json`.

## Reglas de negocio de datos
- Contenido editable de forma permanente: `scripts/raw/*.json` → `node scripts/build-media.mjs`.
- Toda URL de medio debe apuntar a `/media/...` (local). Videos por extensión `.mp4|webm|mov|ogg|m4v`.
- El formulario NO valida en servidor más allá de requerir credenciales de Gmail; el front valida los
  campos obligatorios (nombre, teléfono, tipo, fecha, personas, aviso).
