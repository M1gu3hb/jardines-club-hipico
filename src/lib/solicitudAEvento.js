import { SOLICITUD_ESTATUS } from "@/lib/catalogos";

/**
 * solicitudAEvento — traduce una solicitud del formulario público a los campos del alta de
 * evento. **Función pura**: no lee, no escribe, no toca la red. Todo lo que decide es
 * comprobable desde una prueba.
 *
 * ⚠️ DE QUIÉN SON ESTOS DATOS
 *   Los escribió **un desconocido** desde el formulario público. Que ya estén en la base no
 *   los vuelve confiables: solo significa que pasaron por `solicitud_crear`, que sí acota
 *   longitudes (`solicitudes_longitudes`: nombre ≤120, email ≤160, comentarios ≤2000,
 *   tipo ≤80, salón ≤120, personas 0–5000). Esa RPC es la única puerta pública, así que el
 *   material llega acotado — pero **nada de lo que traiga puede llegar a `eventos` sin pasar
 *   por lo mismo que un alta manual**:
 *
 *   - El **salón** no se copia: es texto libre en la solicitud y un `salon_id` en el evento.
 *     Se resuelve contra los salones reales y, si no casa, se deja vacío. Nunca se adivina.
 *   - La **fecha** solo se propone si es una fecha de verdad (`YYYY-MM-DD`). Una cadena rara
 *     escrita ahí reventaría el INSERT con 22007.
 *   - El **correo** solo se propone si tiene forma de correo. Importa más de lo que parece:
 *     ahí es donde luego se le mandan al cliente sus accesos.
 *   - Todo lo demás va a **notas internas**, recortado, y **el admin lo ve y lo puede
 *     corregir antes de guardar**. Es una ayuda para no volver a teclear, no un automatismo.
 *   - **Usuario y contraseña NO se derivan de nada de aquí.** Son credenciales; las pone el
 *     admin. Derivarlas del correo o del nombre las haría adivinables desde fuera.
 */

/** Recorta sin cortar a mitad de palabra de forma fea, y sin dejar que un texto largo domine. */
const recorta = (v, max) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
};

/** `YYYY-MM-DD` y además una fecha que existe. `2026-02-31` casa el patrón y no es una fecha. */
export function fechaValida(v) {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? "" : s;
}

/**
 * Forma de correo, deliberadamente laxa: aquí no se valida para aceptar, se valida para **no
 * proponer basura**. Si no casa se deja el campo vacío y el admin lo escribe.
 */
export function correoValido(v) {
  const s = String(v ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 160 ? s : "";
}

/** Normaliza para comparar nombres de salón: sin acentos, sin dobles espacios, minúsculas. */
const clave = (v) =>
  String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();

/** Lo que el formulario público ofrece cuando el cliente aún no ha elegido salón. */
export const SALON_SIN_DEFINIR = ["por definir", "sin definir", "no lo se", "no lo sé", ""];

/**
 * Resuelve el salón por NOMBRE contra los salones reales.
 *
 * Solo casa exacto (normalizando acentos y espacios). Nada de parecidos: un salón mal
 * asignado es peor que uno sin asignar — el evento se prepararía en el sitio equivocado y
 * nadie lo notaría hasta el día.
 *
 * TRES RESULTADOS, NO DOS. `salones` puede llegar vacío por dos motivos que no se parecen en
 * nada: **no hay salones registrados** o **la lectura se cayó**. Juntarlos hacía que, con la
 * lectura caída, esta función dijera `no_casa` para un salón que SÍ está registrado, y la
 * pantalla se lo afirmaba al dueño. Es el `[]` ambiguo de J-02 un piso más arriba: `useCarga`
 * lo separa en tres estados y aquí se volvían a juntar dos.
 *
 * Por eso `salones` **no puede ser opcional**: quien llama tiene que pasar `null` cuando no
 * lo sabe. Un array vacío significa "miré y no hay ninguno", que es una afirmación distinta.
 *
 * @param {string} texto  el salón que escribió el cliente
 * @param {Array|null} salones  los salones reales, o `null` si no se pudieron leer
 * @returns {{salonId: string, motivo: "exacto"|"sin_definir"|"no_casa"|"lista_no_disponible"}}
 */
export function resolverSalon(texto, salones) {
  // Antes que nada: si no se sabe qué salones hay, no se puede afirmar NADA sobre este.
  if (!Array.isArray(salones)) return { salonId: "", motivo: "lista_no_disponible" };
  const t = clave(texto);
  if (SALON_SIN_DEFINIR.includes(t)) return { salonId: "", motivo: "sin_definir" };
  const encontrado = salones.find((s) => clave(s.nombre) === t);
  return encontrado
    ? { salonId: encontrado.id, motivo: "exacto" }
    : { salonId: "", motivo: "no_casa" };
}

/**
 * Nombre propuesto para el evento. La solicitud no trae ninguno.
 *
 * Se propone `tipo · cliente` porque es lo que el dueño reconoce en la lista, y es **editable**.
 * Si no hay ni tipo ni nombre, se cae al folio, que siempre existe — y nunca a "" (un evento
 * sin nombre desactiva la confirmación del borrado; ver 8F-2).
 */
export function nombrePropuesto(s) {
  const tipo = recorta(s?.tipoEvento, 40);
  const cliente = recorta(s?.nombreCompleto, 60);
  if (tipo && cliente) return `${tipo} · ${cliente}`;
  return tipo || cliente || `Solicitud ${recorta(s?.folio, 30) || "sin folio"}`;
}

/**
 * Lo que NO tiene columna propia en `eventos` y aun así hay que conservar, en notas internas.
 *
 * `numero_personas` y `actividades_extras` llegan del formulario y no tenían destino: se
 * perdían al convertir. `horario_inicio`, `horario_fin`, `direccion`, `rfc` y
 * `manteleria_preferida` son columnas que la RPC pública **no acepta** —comprobado: 0 de 6
 * solicitudes tienen dato— así que hoy nunca vienen rellenas; se incluyen solo si algún día
 * alguien las rellena por otra vía, y si no, no ensucian la nota.
 */
export function notasDeSolicitud(s) {
  const lineas = [];
  const pon = (etiqueta, valor, max = 300) => {
    const v = recorta(valor, max);
    if (v) lineas.push(`${etiqueta}: ${v}`);
  };

  pon("Folio", s?.folio, 40);
  if (s?.fechaEnvio) pon("Recibida", `${recorta(s.fechaEnvio, 20)}${s?.horaEnvio ? " " + recorta(s.horaEnvio, 20) : ""}`);
  if (s?.numeroPersonas != null && s.numeroPersonas !== "") pon("Personas estimadas", String(s.numeroPersonas), 20);
  if (s?.horarioInicio || s?.horarioFin) {
    pon("Horario pedido", [recorta(s.horarioInicio, 20), recorta(s.horarioFin, 20)].filter(Boolean).join(" – "));
  }
  pon("Dirección", s?.direccion, 200);
  pon("RFC", s?.rfc, 40);
  pon("Mantelería", s?.manteleriaPreferida, 120);

  // `actividades_extras` es jsonb: puede venir como array, como objeto o como texto.
  const act = s?.actividadesExtras;
  if (Array.isArray(act) && act.length) pon("Actividades pedidas", act.join(", "), 400);
  else if (act && typeof act === "object" && Object.keys(act).length) pon("Actividades pedidas", JSON.stringify(act), 400);
  else if (typeof act === "string") pon("Actividades pedidas", act, 400);

  pon("Salón que pidió", s?.salonSeleccionado, 120);
  pon("Comentarios del cliente", s?.comentarios, 1200);

  return lineas.length ? `— De la solicitud ${recorta(s?.folio, 40) || "(sin folio)"} —\n${lineas.join("\n")}` : "";
}

/**
 * El mapeo completo. Devuelve el formulario prellenado **y** los avisos que el admin tiene que
 * leer antes de guardar: qué no se pudo trasladar y por qué.
 *
 * `usuario` y `password` van vacíos a propósito.
 */
export function solicitudAEvento(solicitud, salones) {
  const s = solicitud || {};
  const salon = resolverSalon(s.salonSeleccionado, salones);
  const fecha = fechaValida(s.fechaTentativa);
  const correo = correoValido(s.email);

  const avisos = [];
  if (salon.motivo === "lista_no_disponible") {
    // NO se dice que no casa: no se ha podido mirar. Afirmar lo contrario es exactamente el
    // fallo que este caso existe para evitar.
    avisos.push(
      `No se pudo leer la lista de salones, así que NO se ha comprobado si «` +
      `${recorta(s.salonSeleccionado, 60) || "(sin salón)"}» está registrado. No se afirma nada ` +
      `sobre él.`,
    );
  } else if (salon.motivo === "no_casa") {
    avisos.push(
      `El salón que pidió («${recorta(s.salonSeleccionado, 60)}») no coincide con ninguno de los ` +
      `registrados, así que se deja SIN ASIGNAR. Elígelo tú: asignar el equivocado es peor.`,
    );
  } else if (salon.motivo === "sin_definir" && String(s.salonSeleccionado || "").trim()) {
    avisos.push("El cliente no eligió salón («Por definir»). Queda sin asignar.");
  }
  if (s.fechaTentativa && !fecha) {
    avisos.push(`La fecha tentativa («${recorta(s.fechaTentativa, 40)}») no es una fecha válida y no se copió.`);
  }
  if (s.email && !correo) {
    avisos.push(`El correo («${recorta(s.email, 60)}») no tiene forma de correo y no se copió.`);
  }
  if (!correo) {
    avisos.push("Sin correo de contacto no se le puede avisar al cliente por email ni mandarle sus accesos.");
  }

  return {
    // Quien llama NO debe dejar guardar mientras esto sea falso: el desplegable de salón
    // estaría vacío y el evento se guardaría sin salón después de que la pantalla dijera que
    // el que pidió el cliente no existe.
    puedeDecidirSalon: salon.motivo !== "lista_no_disponible",
    form: {
      nombreEvento: nombrePropuesto(s),
      tipoEvento: recorta(s.tipoEvento, 80),
      fechaEvento: fecha,
      salonId: salon.salonId,
      clienteNombre: recorta(s.nombreCompleto, 120),
      clienteEmail: correo,
      clienteTelefono: recorta(s.telefono, 30),
      notas: notasDeSolicitud(s),
      // Credenciales: SIEMPRE vacías. Las pone el admin.
      usuario: "",
      password: "",
    },
    avisos,
    salonMotivo: salon.motivo,
  };
}

/**
 * Estatus que se PROPONE para la solicitud al convertirla. Se propone, no se impone: el admin
 * elige, y puede dejarlo como está.
 *
 * Sale de `SOLICITUD_ESTATUS` (el espejo del CHECK de la base), nunca de una lista nueva: esa
 * divergencia es la que rompió el guardado del estatus en el bloque 7.
 */
export const ESTATUS_TRAS_CONVERTIR = SOLICITUD_ESTATUS.filter((e) => e === "Cotizada" || e === "Cerrada");
