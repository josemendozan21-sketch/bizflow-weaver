# Overlap en comisiones + logos ilimitados en el pedido

## 1. Arreglar el solapamiento de la tabla de comisiones

En la vista del asesor, la columna "Fecha" tiene ancho fijo de 74px pero además puede
mostrar la etiqueta "FDS", y la columna "N° Pedido" (116px) es más angosta que el código
(`MW-AM-01141`), por eso el badge se parte en dos líneas y se monta sobre la fecha.

Cambios (solo presentación, en `MisComisiones.tsx` y el mismo patrón en `CommissionsPanel.tsx`):

- Ampliar "Fecha" a ~92px y mostrar la marca de fin de semana como un punto/indicador
  pequeño con tooltip "Venta de fin de semana" en lugar de un badge de texto que empuja
  la celda.
- Ampliar "N° Pedido" a ~140px y forzar una sola línea en `OrderCodeBadge`
  (`whitespace-nowrap`, sin quiebre del texto mono).
- Reducir "Acción" a un ancho menor usando un botón compacto ("Corrección" con icono) y
  dejar que "Cliente" absorba el espacio sobrante; mantener truncado con tooltip.
- Revisar el total de anchos para que a 1206px no aparezca scroll horizontal ni recortes.

## 2. Logos ilimitados al crear el pedido

Hoy el formulario está fijo en 1 o 2 logos (`logoCount`, `Logo 1` / `Logo 2`,
`logo_url`, `logo_url_2`, `logo_name`, `logo_name_2`).

### UX propuesta

Reemplazar el selector "1 logo / 2 logos" por una lista dinámica:

```text
Logos del pedido                       [ + Agregar logo ]
┌───────────────────────────────────────────────────────┐
│ 1 ▸ [archivo]  [Nombre o referencia *]        [ 🗑 ]   │
│ 2 ▸ [archivo]  [Nombre o referencia *]        [ 🗑 ]   │
│ 3 ▸ [archivo]  [Nombre o referencia *]        [ 🗑 ]   │
└───────────────────────────────────────────────────────┘
Sin logo (marcación sin arte)  [switch existente]
```

- Empieza con 1 logo; "Agregar logo" añade filas sin límite.
- Cada fila: archivo (imagen/PDF/SVG/AI), nombre obligatorio, miniatura con
  `LogoPreview`, botón eliminar (no se puede borrar la última si el pedido lleva logo).
- El switch "sin logo" oculta la lista completa.
- Validación: cada fila debe tener archivo + nombre antes de guardar.
- Se mantiene el borrador persistido (nombres; los archivos no se persisten, igual que hoy).

### Datos

- Nueva columna `logos jsonb` en `orders` (arreglo `[{ name, url }]`) como fuente
  canónica, y `extra_logos jsonb` en `logo_requests` para los logos 3+.
- Compatibilidad: al guardar se siguen escribiendo `logo_url`/`logo_name` y
  `logo_url_2`/`logo_name_2` con los dos primeros, y `logo_count` con el total, para no
  romper vistas y exportaciones existentes.
- La solicitud de diseño (`createLogoRequestFromOrder`) se generaliza para recibir N
  archivos y subirlos todos a `logo-files`.

### Vistas que muestran logos

Diseño (`TrabajoDisenador`, `NuevasSolicitudes`, `AprobacionAsesor`,
`DisenosFinalizados`) y Estampación pasan a renderizar la lista completa con
`LogoPreview` (leyendo `logos`/`extra_logos` y cayendo a los campos antiguos cuando el
pedido es previo al cambio).

## Verificación

- Typecheck.
- Revisión en navegador autenticado a 1206px: tabla de comisiones sin solapamiento ni
  scroll horizontal, y alta de un pedido con 3 logos que llegue completo a Diseño.
