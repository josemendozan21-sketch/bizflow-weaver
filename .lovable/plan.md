# Buscador inteligente de logos para recompras

Hoy, en recompra, el asesor solo tiene un `Select` que lista hasta 20 logos filtrados por coincidencia exacta del nombre de cliente escrito (Magical). En Sweatspot no hay selector: solo el texto "El logo ya existe", sin forma de escoger ni de subir uno. Resultado: si el nombre del cliente se escribió distinto, el logo "no aparece" y el asesor queda bloqueado.

## Qué se construye

Un buscador de logos reutilizable (diálogo) disponible en recompra tanto para Magical como para Sweatspot.

- Botón "Buscar logo del cliente" que abre un diálogo con:
  - Campo de búsqueda libre (cliente, marca, nombre de logo, producto, código de pedido).
  - Precarga automática con el cliente y la marca que el asesor ya escribió en el formulario.
  - Chips de filtro rápido: Marca (Magical / Sweatspot / Todas) y "Solo de este cliente".
  - Resultados en grilla con vista previa real (usa `LogoPreview`, así que también muestra miniatura de PDF), nombre del logo, cliente, marca, producto, fecha y estado.
  - Botón "Usar este logo" por resultado y "Ver / abrir archivo".
- Búsqueda tolerante: no depende de escribir el cliente idéntico. Se normaliza (sin tildes, minúsculas) y se busca por coincidencia parcial en cliente, nombre de logo, producto y marca, ordenado por relevancia (cliente exacto primero, luego cliente parecido, luego resto) y por fecha reciente.
- Si no hay resultados: mensaje claro y acceso directo a subir el archivo del logo (el flujo de adjuntar sigue disponible siempre).
- Una vez seleccionado, se muestra una tarjeta con la vista previa del logo elegido y un botón "Cambiar logo", en lugar del `Select` de texto plano actual.

## Sweatspot

Se añade el mismo bloque de recompra que hoy solo tiene Magical: seleccionar logo previo (con el buscador) o adjuntar archivo, con la misma validación de "logo requerido" antes de enviar el pedido.

## Detalles técnicos

- Nuevo componente `src/components/ventas/LogoSearchDialog.tsx` + hook `src/hooks/useLogoSearch.ts`.
- Fuentes de datos (solo lectura, sin cambios de esquema):
  - `logo_requests`: `client_name`, `brand`, `logo_name`, `product`, `status`, `original_logo_url`, `adjusted_logo_url`, `extra_logos`, `created_at` (316 registros, 311 con logo ajustado).
  - `orders`: logos ya usados en pedidos (`logo_url` y `logos`) para cubrir recompras cuyo logo nunca pasó por Diseño.
- Se prefiere `adjusted_logo_url` sobre `original_logo_url`; se deduplica por URL.
- Consulta con `ilike` sobre varios campos y `limit 60`, con debounce de 300 ms; el término vacío muestra los logos del cliente actual.
- Reutiliza `LogoPreview` para imágenes y PDFs (ya soporta miniatura de PDF).
- En `src/pages/Ventas.tsx`: se reemplaza el `Select` de "Logo anterior del cliente" por el nuevo bloque en el formulario Magical y se agrega el bloque equivalente en el formulario Sweatspot, guardando la URL elegida en el estado de recompra ya existente (`recompraLogoUrl` y un nuevo `ssRecompraLogoUrl`).
- La lógica de envío no cambia de forma: la URL seleccionada se sigue guardando como `logo_url` del pedido y no se crea solicitud de diseño en recompras.
