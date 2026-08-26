# Videos originales del hero

Los **masters** de los dos videos del fondo de la portada, tal como salieron de Veo.

| Archivo | Se convierte en | Nota |
|---|---|---|
| `que_la_transicion_no_sea_blanc.mp4` | `public/media/img/hero-salon-720.mp4` | 8 s completos |
| `Video_Generado_Con_Imagen_De_Referencia.mp4` | `public/media/img/hero-jardin-720.mp4` | recortado a los primeros 3.7 s |

## Por qué están versionados

Porque ya se perdieron una vez. Los que había en producción llevaban tanto tiempo pasando de
un sitio a otro que habían bajado de 1280×720 a 854×480 sin que nadie lo decidiera, y para
recuperarlos hubo que ir a buscar los originales. Catorce megas en el repositorio son baratos
comparados con volver a esa búsqueda.

**Esta carpeta NO se despliega**: está fuera de `public/`, así que no viaja al sitio.

## Cómo se regeneran

```bash
ffmpeg -i "vid img/que_la_transicion_no_sea_blanc.mp4" \
  -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -profile:v high -level 4.0 -movflags +faststart \
  public/media/img/hero-salon-720.mp4

ffmpeg -i "vid img/Video_Generado_Con_Imagen_De_Referencia.mp4" -t 3.7 \
  -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -profile:v high -level 4.0 -movflags +faststart \
  public/media/img/hero-jardin-720.mp4
```

`-an` quita el audio a propósito: el hero va en `muted`, así que la pista solo pesaría.

**Si los regeneras, cámbiales el nombre.** `/media/` se sirve con caché de 30 días: reescribir
un archivo sin cambiarle el nombre deja viendo el viejo a quien ya haya pasado por el sitio.
