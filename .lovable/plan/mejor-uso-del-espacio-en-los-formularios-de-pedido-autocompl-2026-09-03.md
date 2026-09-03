# Mejor uso del espacio en los formularios de pedido + autocompletado de dirección

Basado en el video: el formulario de Magical y Sweatspot ocupa media pantalla, las direcciones y el bloque de Pago desperdician espacio, y los campos obligatorios no se distinguen.

## 1. Ancho del formulario

Hoy ambos formularios están dentro de `Card className="max-w-2xl"` (Magical y Sweatspot), por eso quedan a media página. Se amplían a todo el ancho disponible del contenedor (con un tope cómodo de lectura), de modo que las grillas puedan usar 3 columnas reales en escritorio.

## 2. Información del cliente en 3 columnas

Reorganizar el bloque en una grilla de 3 columnas en escritorio (2 en tablet, 1 en móvil) con orden lógico:

```text
Fila 1:  Nombre del cliente | Cédula o NIT     | Número de contacto
Fila 2:  Correo electrónico | Ciudad           | Departamento
Fila 3:  Dirección de envío (ocupa las 3 columnas)
```

La dirección queda sola a lo ancho porque es el campo más largo y así cabe el autocompletado.

## 3. Bloque de Pago en una sola fila

Hoy Abono/Estado van en 2 columnas y luego Fecha del pago, Medio de pago y Soporte van uno debajo del otro. Nueva estructura:

```text
Fila 1:  Abono | Estado del pago | Fecha del pago
Fila 2:  Medio de pago | Soporte de pago inicial | Fecha requerida de entrega
```

Cuando el estado es "Pago total recibido" el campo Abono se oculta y los demás se recolocan sin dejar huecos. Los textos de ayuda pasan a ser líneas cortas debajo de cada campo.

Se aplica idéntico en Magical y en Sweatspot.

## 4. Campos obligatorios con asterisco rojo

El helper `Field` y los selectores (`ColorSelect`, estado de pago, etc.) reciben un asterisco rojo visible junto a la etiqueta cuando el campo es obligatorio, más una leyenda "* Campo obligatorio" al inicio de cada formulario. Se revisan también los campos de las líneas de producto que ya tienen `required` pero no lo muestran.

## 5. Autocompletado de dirección (Google)

Campo "Dirección de envío" con predicción tipo Google: al escribir aparecen sugerencias y, al elegir una, se llena la dirección y se completan Ciudad y Departamento automáticamente.

- Se implementa con Google Places Autocomplete a través de una función de backend (para no exponer la llave en el navegador) y un componente reutilizable `AddressAutocomplete`, usado en Magical, Sweatspot y venta al detal.
- Requiere una llave de Google Maps Platform con Places API habilitada; se pedirá al guardarla como secreto. Si prefieres no usar Google, la alternativa es autocompletar con las direcciones ya registradas de clientes del sistema (sin costo, pero sin direcciones nuevas).
- El campo sigue permitiendo escribir libremente si la dirección no aparece en las sugerencias.

## Detalles técnicos

- Archivo principal: `src/pages/Ventas.tsx` (formularios Magical, Sweatspot y detal).
- Nuevo componente `src/components/ventas/AddressAutocomplete.tsx` + edge function `google-places-autocomplete` (predicciones y detalle del lugar).
- `Field` gana soporte de asterisco y de `colSpan`; las grillas pasan a `sm:grid-cols-2 lg:grid-cols-3`.
- Sin cambios en la lógica de guardado, prorrateo de abonos ni comisiones.
