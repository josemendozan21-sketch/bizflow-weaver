# Dirección de envío: compatible con el llenado por IA + campo de complemento

## Qué está pasando hoy

- El llenado automático con IA sí extrae la dirección, pero la escribe "a la fuerza" en el input del DOM. El nuevo campo de dirección con Google Maps guarda su texto en el estado de React, así que ese valor se pierde y el campo se ve vacío. Los demás campos (nombre, NIT, teléfono, ciudad) sí funcionan porque son inputs simples.
- En **Magical detal** hay dos campos de dirección duplicados en pantalla (el nuevo con Google Maps y el viejo de texto), lo que además puede enviar el dato dos veces.
- No existe un campo de complemento (oficina, apartamento, bloque, interior, local), y hoy todo eso se mezcla dentro de la dirección principal.

## Qué se va a hacer

### 1. Que la IA llene la dirección correctamente
- Conectar el campo de dirección de Magical mayor y Sweatspot mayor al estado de React (igual que ya está en detal), para que el llenado con IA lo actualice de verdad.
- Después del llenado, la dirección queda editable y con las sugerencias de Google Maps activas (sin dispararse sola con el texto recién pegado).
- Quitar el campo de dirección duplicado en Magical detal.

### 2. Nuevo campo "Complemento"
- Agregar un campo opcional **Complemento (oficina, apto, bloque, interior, local)** junto a la dirección en los tres formularios: Magical mayor, Sweatspot mayor y Magical detal.
- Ejemplo: Dirección = `Calle 117 # 6a-60`, Complemento = `OFC 402`.
- Se guarda en una columna nueva del pedido y también se refleja en la dirección completa que ven Logística y Despachos, para no romper nada de lo existente.

### 3. La IA también entiende el complemento
- Se actualiza el asistente de lectura de texto para que separe la dirección base del complemento: cuando el mensaje dice "Calle 117 # 6a-60 OFC 402", la dirección queda como `Calle 117 # 6a-60` y el complemento como `OFC 402`. Reconoce oficina/of/ofc, apto/apartamento, torre, bloque, interior, local, piso, casa, conjunto.
- Si el cliente no da complemento, el campo queda vacío.

### 4. Mostrar la dirección completa donde ya se usa
- En la confirmación del pedido, en los detalles del pedido y en las vistas de entregas se muestra "dirección + complemento" en una sola línea legible.

## Detalles técnicos

- Migración: `ALTER TABLE public.orders ADD COLUMN client_address_complement text;` (nulo permitido, sin cambios de RLS ni de grants existentes).
- `src/components/ventas/AddressAutocomplete.tsx`: nueva prop opcional `complementValue` / `onComplementChange` + `complementName` para renderizar el complemento como parte del mismo componente reutilizable (así queda consistente en las tres marcas/flujos); se mantiene el fallback a texto libre si Google Maps no responde.
- `src/pages/Ventas.tsx`:
  - estados `mwDireccion`/`mwComplemento` y `ssDireccion`/`ssComplemento` (persistidos como los demás borradores) conectados a `AddressAutocomplete`;
  - los handlers de `SmartPasteField` (`onDataParsed`) pasan a usar los setters de estado para dirección/complemento en lugar de escribir en el DOM;
  - eliminar el `Input name="direccion"` duplicado del formulario detal;
  - en los tres `handleSubmit`, guardar `client_address` (dirección base) y `client_address_complement`.
- `supabase/functions/parse-order-text/index.ts`: agregar `complemento` al esquema de la herramienta y la instrucción de separación en el prompt; redesplegar la función.
- `src/components/ventas/SmartPasteField.tsx`: agregar `complemento?: string | null` a `ParsedOrderData`.
- Vistas de lectura (confirmación de pedido, `MisPedidos`, entregas/logística): componer la dirección con un pequeño helper `formatAddress(address, complement)` en `src/lib/` para no repetir lógica.
- No se toca nada de comisiones, pagos, reservas ni producción.
