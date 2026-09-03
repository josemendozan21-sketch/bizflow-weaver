# Logos múltiples en Sweatspot (mismo componente que Magical)

Magical ya permite agregar logos ilimitados con el componente `OrderLogosField` (archivo + nombre por logo, vista previa, agregar/quitar). Sweatspot sigue con un solo archivo y un solo nombre. Se reutiliza el mismo componente para Sweatspot.

## Qué cambia para el asesor de Sweatspot

- La sección de logos pasa a ser la misma tarjeta de Magical: "Logos del pedido (N)" con botón **Agregar logo**, y por cada logo su archivo, su nombre/referencia y su miniatura.
- Se pueden agregar tantos logos como lleve la marcación (sin límite), y eliminarlos salvo el primero.
- Validación igual que en Magical: si el pedido lleva logo, cada fila necesita archivo y nombre; con "No requiere logo" o recompra con el mismo logo, la sección se oculta.
- Todos los logos quedan guardados en el pedido y viajan a la solicitud de diseño, para que Diseño y Estampación los vean completos.
- El resumen de confirmación del pedido lista los logos adjuntos en vez del único campo actual.

## Detalles técnicos

En `src/pages/Ventas.tsx`, formulario Sweatspot:

- Reemplazar el estado `ssLogoFileState` y el campo `ss_logo_nombre` por `ssLogos: LogoEntry[]` (`useState([makeLogoEntry()])`), igual que `mwLogos`.
- Renderizar `<OrderLogosField logos={ssLogos} onChange={setSsLogos} />` en lugar del `FileField` "Adjuntar logo" + input de nombre, condicionado a `!ssNoLogo && !(ssIsRecompra && ssRecompraMismoLogo === "si")`.
- En el submit: derivar `activeLogos`, `logoFile`, `logoFile2`, `logoNombre`, `logoNombre2` y `logosCount` con la misma lógica de Magical, incluida la validación de fila incompleta.
- Pasar `logoFile2`, `logoName2` y `extraLogos` a `createLogoRequestFromOrder` (ya soporta N logos) y recoger `logoUrl2` / `extraLogoUrls`.
- Añadir al insert de `orders` de Sweatspot: `logo_url_2`, `logo_count`, `logo_name`, `logo_name_2` y el arreglo `logos` con `{ name, url }` por logo (mismo mapeo que Magical, incluido el caso de recompra reutilizada).
- Actualizar el resumen de confirmación de Sweatspot (`archivos`) para listar `Logo 1..N` con sus nombres, tomando los datos de `ssLogos` en vez de `getFileName(form, "ss_logo")`; ajustar el tipo de args del builder del resumen.
- Limpiar `ssLogos` al reiniciar el formulario tras crear el pedido.
- Sin cambios de base de datos: las columnas `logo_url_2`, `logo_count`, `logo_name_2` y `logos` ya existen y `logo_requests.extra_logos` también.
