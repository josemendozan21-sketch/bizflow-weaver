# Historial de cambios duplicado — diagnóstico y corrección

## Qué está pasando (verificado en la base de datos)

No es un bug del historial: el historial está registrando correctamente **dos cambios reales**, pero corresponden a **una sola edición del usuario**.

Los cuerpos de Magical viven en dos tablas espejo:

```text
Usuario edita "Bacteria (Térmico)" -> stock_items.available 0 -> 14   (registro 1)
        trigger espejo automático  -> body_stock.available  0 -> 14   (registro 2)
```

Ambos registros quedan con la **misma fecha y hora exacta** (18:22:49.685867), el mismo campo y los mismos valores; solo cambia la tabla de origen y el nombre (`Bacteria` vs `Bacteria (Térmico)`).

Esto solo ocurre en la categoría **Cuerpos / Referencias** de Magical, que es la única con sincronización espejo. El resto del inventario registra una sola línea.

## Corrección propuesta

1. **Evitar el doble registro en adelante**: la función de auditoría dejará de escribir cuando el cambio provenga de la sincronización espejo (es decir, cuando ya se está ejecutando dentro de otro trigger). Así queda registrada únicamente la edición original que hizo la persona, con su usuario, fecha y hora.
2. **Ocultar los duplicados históricos ya guardados**: el historial existente no se puede modificar ni borrar (es de solo lectura, por diseño). En su lugar, la vista agrupará los registros que compartan usuario, marca, campo, valores y el mismo instante exacto, y mostrará una sola línea con el nombre completo de la referencia. Lo mismo aplica a la descarga en Excel.

No se cambia nada de la lógica de inventario, ni las cantidades, ni la sincronización entre `stock_items` y `body_stock`.

## Detalle técnico

- Migración: actualizar `public.log_inventory_change()` para retornar temprano cuando `pg_trigger_depth() > 1`, conservando `SECURITY DEFINER` y `search_path = public`. Se mantiene el registro de `logo` y `sweatspot_category` ya agregado.
- Frontend: en `src/components/inventory/InventoryChangeLogPanel.tsx` (y el hook `useInventoryAuditLog.ts` si corresponde), deduplicar por clave `changed_at + changed_by + brand + field + old_value + new_value`, prefiriendo el registro de `body_stock` cuando existe (nombre con el tipo incluido) o mostrando `nombre (tipo)`. Aplicar la misma deduplicación antes de exportar a Excel.
- Verificación: repetir una edición de un cuerpo Magical y confirmar que aparece una sola línea nueva en el historial.
