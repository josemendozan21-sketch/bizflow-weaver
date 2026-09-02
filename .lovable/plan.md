# Numeración de pedidos por marca y asesor

Hoy cada pedido ya tiene un consecutivo único con formato `BN-00123`. El cambio es que ese código identifique la marca y el asesor, sin perder la unicidad ni la lógica actual.

## Formato propuesto

```text
SW-VM-00123    Sweatspot · Valentina Mendoza · consecutivo 123
MW-AM-00124    Magical Warmers · Ángela Mendoza · consecutivo 124
MW-PB-00125    Magical Warmers · Pilar Beltrán
MW-JH-00126    Magical Warmers · Jailin Herrera
SW-ON-00127    Sweatspot · Pedidos Online
```

- `SW` = Sweatspot, `MW` = Magical Warmers.
- Dos o tres letras que identifican al asesor.
- El número final sigue siendo el consecutivo global: nunca se repite, aunque cambien marca o asesor.

## Siglas de asesores

Se agrega un campo "sigla" al perfil de cada usuario, que Administración puede ver y editar. Siglas iniciales según los asesores activos hoy:

| Asesor | Sigla |
|---|---|
| Pilar Beltrán | PB |
| Ángela Mendoza | AM |
| Valentina Mendoza | VM |
| Jailin Herrera Soto | JH |
| Iliang Hernández | IH |
| José Mendoza | JM |
| Pedidos Online Sweatspot | ON |

Si un asesor nuevo no tiene sigla asignada, el sistema genera una automática con las iniciales de su nombre y, si ya existe, le agrega un número para que no se repita.

## Qué cambia en la aplicación

- Todos los pedidos existentes se renumeran al nuevo formato conservando su número consecutivo (el pedido `BN-00123` de Valentina pasa a `SW-VM-00123`), para que no haya códigos viejos y nuevos conviviendo.
- El código se muestra igual que hoy en Mis Pedidos, Comisiones, bandeja de Inventarios y Estampación; ahora también se podrá buscar escribiendo solo `SW`, `MW` o la sigla del asesor para filtrar por marca o por asesor.
- Se agrega una pantalla simple en Administración para asignar o corregir la sigla de cada usuario.
- No cambia ningún estado, comisión, descuento ni flujo de producción.

## Detalles técnicos

1. Migración:
   - `profiles.advisor_code text` con índice único (case-insensitive), poblado con la tabla de arriba y derivado del nombre para el resto.
   - `orders.advisor_code text` y `orders.brand_code text`; se llenan en un trigger `BEFORE INSERT` a partir de `advisor_id`/`brand` (fallback por `advisor_name`/email, `XX` si no hay coincidencia).
   - Se redefine la columna generada `orders.order_code` como `brand_code || '-' || advisor_code || '-' || lpad(order_number,5,'0')`.
   - `production_orders.order_code` se sincroniza con el nuevo valor.
   - Backfill de `brand_code`/`advisor_code` en los pedidos históricos con `UPDATE`; el consecutivo `order_number` y la secuencia no se tocan.
2. Frontend:
   - `src/pages/Ventas.tsx`: no requiere cambios de formato (el código lo genera la base), solo se sigue mostrando `order_code` en el resumen.
   - Buscadores existentes en `MisPedidos.tsx`, `WholesaleOrdersInbox.tsx`, `EstampacionProductionView.tsx` ya filtran por `order_code`; se normaliza la búsqueda para ignorar guiones y mayúsculas.
   - Nueva sección de siglas en la vista de administración de usuarios (lectura/edición solo Admin, vía RLS existente de `profiles`).
