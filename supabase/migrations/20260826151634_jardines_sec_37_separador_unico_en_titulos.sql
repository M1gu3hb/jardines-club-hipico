-- ════════════════════════════════════════════════════════════════════════════════
-- sec_37 · Un solo separador en los títulos de búsqueda
-- ════════════════════════════════════════════════════════════════════════════════
--
-- PARA QUÉ. Seis páginas firmaban «… | Jardines Club Hípico» y veintiocho
-- «… · Jardines Club Hípico». El título es lo primero que se ve en un resultado de búsqueda,
-- y dos formatos distintos delatan dos tandas de redacción en un sitio que debería leerse
-- escrito de una vez. Gana el punto medio, que es el que usan las veintiocho.
--
-- ESTO SOLO ARREGLA LO GUARDADO. La normalización de verdad está en `componeTitulo()`, en
-- `src/lib/Cabecera.jsx`: el dueño escribe estos títulos desde el panel y nada le impide
-- teclear una barra mañana. Este UPDATE existe para que el panel enseñe lo mismo que se
-- publica; sin él, los dos discreparían y alguien perdería una tarde averiguando por qué.
--
-- SOLO EL SEPARADOR. No se toca ni una palabra del texto: se sustituye la secuencia
-- «espacio barra espacio» que precede al nombre del negocio, y nada más.
--
-- LAS SEIS FILAS AFECTADAS: bodas, xv-anos, infantiles, corporativos y nocturnos en
-- `tipos_evento`, y salon-de-los-espejos en `salones` —esta última no estaba en la lista de
-- la auditoría, apareció al contar sobre el `dist` en vez de fiarse del documento—.
--
-- ADITIVA Y ACOTADA. Dos UPDATE sobre `jardines`, filtrados por la barra. No toca esquema,
-- políticas, permisos ni nada del schema `public` (Vero Seguros queda intacto).
-- ════════════════════════════════════════════════════════════════════════════════

BEGIN;

UPDATE jardines.tipos_evento
SET seo_title = replace(seo_title, ' | Jardines Club Hípico', ' · Jardines Club Hípico')
WHERE seo_title LIKE '% | Jardines Club Hípico%';

UPDATE jardines.salones
SET seo_title = replace(seo_title, ' | Jardines Club Hípico', ' · Jardines Club Hípico')
WHERE seo_title LIKE '% | Jardines Club Hípico%';

COMMIT;
