# 09 · SEO LOCAL — lo que vive fuera del sitio

> **2026-08-24.** Para un recinto físico, esto pesa **tanto o más** que el SEO del sitio.
> Nada de aquí se cambia sin autorización explícita del dueño.

---

## 1. Por qué esto importa más de lo que parece

Ver `03-ARQUITECTURA` §1: las búsquedas genéricas del sector las dominan los directorios. Pero
hay un terreno donde un recinto físico compite de tú a tú y los directorios **no pueden ganarle**:
el **local pack** — el bloque de mapa con tres negocios que Google enseña arriba cuando alguien
busca «salón de eventos Xochimilco» desde su teléfono, a diez kilómetros del lugar.

Ahí no gana quien tiene más autoridad de dominio. Gana quien tiene **la ficha mejor trabajada,
los datos más consistentes y las reseñas más vivas**.

Y hay un segundo motivo, más inmediato: hoy, al buscar la marca, lo que aparece es **Facebook y
varios directorios** — no el sitio propio. Eso es dinero que se va por fichas que no controlas.

---

## 2. NAP — el dato oficial, y hay que congelarlo

Verificado el 2026-08-24 contra `jardines.config_sitio`, `src/config/negocio.js` y el JSON-LD:

```
NOMBRE     Jardines Club Hípico
DIRECCIÓN  Duraznos S/N, Sta Inés, Xochimilco, 16810, Ciudad de México, México
TELÉFONO   +52 55 2311 8153
WHATSAPP   525523118153
CORREO     jardinesclubhipico@gmail.com
COORDS     19.2337103, -99.1114187
MAPA       https://maps.app.goo.gl/HKg8kiUA9gEV9MLf7
```

Los tres sitios coinciden y hay un contrato que impide que diverjan. **Este es el dato oficial.**
Cualquier ficha externa que diga otra cosa está mal y entra en el §4.

> **Aviso histórico, para que no se repita:** el código llegó a tener `525548663656`, un
> `+52 55 0000 0000` y un correo en un dominio que no es del negocio, **incluido en el JSON-LD**
> — que es justo lo que Google lee. Se corrigió el 2026-08-05. Es la razón de que exista
> `src/config/negocio.js` y su contrato.

---

## 3. Google Business Profile — auditoría pendiente

**No se ha auditado**: hace falta acceso a la ficha o capturas. Lo que hay que revisar, y por qué:

| Punto | Qué mirar |
|---|---|
| **Categoría principal** | Es lo que más pesa en el local pack. ¿«Salón de eventos»? ¿«Jardín para eventos»? Elegir la principal correcta y añadir secundarias |
| **Nombre** | Exactamente «Jardines Club Hípico». **Sin** palabras clave añadidas: Google lo penaliza |
| **Dirección** | Que coincida **carácter por carácter** con el NAP |
| **Teléfono** | `+52 55 2311 8153`. Si hay uno viejo, cambiarlo |
| **Sitio web** | Que apunte al sitio propio. Cuando exista el `.mx`, actualizar |
| **Horarios** | Solo si son reales. Un horario inventado genera reseñas negativas |
| **Fotos** | Es de lo que más mueve la aguja. Interiores, exteriores, montajes, eventos, accesos, estacionamiento. Subidas por el negocio, con regularidad |
| **Reseñas** | Cuántas, de cuándo, y **si están respondidas**. Responder importa |
| **Atributos** | Estacionamiento, accesibilidad, WiFi, apto para niños… los que sean ciertos |
| **Productos/Servicios** | Se pueden listar los espacios como servicios, cada uno enlazando a su página nueva |
| **Publicaciones** | Poco usadas y baratas: eventos, disponibilidad, temporada |
| **Ubicación en el mapa** | Que el pin caiga en la entrada real, no en medio del terreno |

**Nada se cambia sin autorización.** Esta fase produce un informe, no una edición.

---

## 4. Directorios — el problema conocido

Ya se detectó que **existen fichas externas con teléfonos anteriores**. Eso hace dos daños: el
obvio —llamadas perdidas— y el de SEO: Google cruza los datos del negocio por la red y **la
inconsistencia le hace desconfiar** de cuál es el bueno.

Fichas detectadas en la búsqueda inicial, **pendientes de verificar una por una**:

- `bodas.com.mx` — ficha «Club Hípico»
- `fechareservada.com` — aparece como «Centro Ecuestre del Sur (Jardines Club Hípico)»
- `banquetes.mx`
- Facebook — `facebook.com/JardinesClubHipico`
- Posibles: `lugaresparaeventos.mx`, `zaloneros.com.mx`, `eventech.mx`, Waze, Apple Maps

**Trabajo de la FASE 9:**

1. Buscar el negocio en cada uno y **anotar qué NAP tiene cada ficha**
2. Marcar cuáles están mal
3. Reclamar la ficha donde se pueda y corregir
4. Donde no se pueda reclamar, escribir al directorio
5. **Estos directorios no son competencia: son canales.** Una ficha bien puesta en
   `bodas.com.mx` manda prospectos reales. Corregirlas es negocio, no solo higiene

> **Ojo con `fechareservada.com`:** aparece como «Centro Ecuestre del Sur (Jardines Club Hípico)».
> Si ese es un nombre anterior del negocio, **es una inconsistencia de nombre**, que es la peor
> de las tres. Hay que decidir cuál es el nombre oficial y unificarlo en todas partes.

---

## 5. La app vieja de Base44 — decidir cuándo apagarla

`jardinesclubhipico.base44.app` sigue viva e indexada por Google. El dueño quiere quitarla.

**Recomendación:** no apagarla en seco. Si tiene señales acumuladas, un 301 al sitio nuevo las
traslada; borrarla las tira.

**Orden:** (1) comprobar qué tiene indexado, (2) si tiene algo, 301 a la URL equivalente del
sitio nuevo, (3) esperar a que Google procese, (4) entonces sí, apagarla. Si no tiene nada
indexado, se apaga sin más.

---

## 6. Search Console — hoy no existe

Sin esto se trabaja a ciegas. Hace falta:

1. Verificar la propiedad del sitio
2. Enviar `sitemap.xml`
3. Revisar cobertura, errores de indexación y consultas reales
4. **Cuando llegue el `.mx`**: dar de alta la propiedad nueva y usar el cambio de dirección

---

## 7. Reseñas — el activo que más pesa y que no se puede fabricar

La tabla `resenas` de la base está **vacía**, y en Google no se han auditado.

Las reseñas mueven el local pack más que casi cualquier otra cosa. Lo que funciona y es legítimo:
pedirlas **después del evento**, cuando el cliente está contento — que es exactamente cuando el
cron de recordatorio de reseña ya está diseñado para actuar, y ese mecanismo **ya existe** en el
CRM.

**No se compran reseñas, no se escriben reseñas, no se inventa un rating.** Regla N3, sin
excepción.

---

## 8. Entregable de la FASE 9

Un informe en esta carpeta, `12-INFORME-SEO-LOCAL.md`, con:

- Estado de la ficha de Google, punto por punto
- Tabla de directorios: dónde aparece, con qué NAP, qué está mal
- Recomendaciones ordenadas por impacto
- Qué se puede corregir solo y qué necesita autorización
- Estado de la app de Base44 y plan para apagarla

**Ninguna edición fuera del código sin visto bueno explícito del dueño.**
