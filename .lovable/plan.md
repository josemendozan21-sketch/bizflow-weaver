## Actualizar referencias de cuerpos Magical Warmers

Sincronizar el listado completo (49 referencias) en las dos tablas que usan los asesores y los paneles de inventario, agregando lo que falta y actualizando cantidades + stock mínimo de lo que ya existe.

### Listado a aplicar (fuente de verdad)

49 referencias con `Disponible` y `Stock Mínimo` según la imagen compartida (Antifaz, Caracoles, Banda Cefálica, Cerebro, Cervical Frío/Térmico, Círculo 8/12 cm Frío/Térmico, Faja Post. Operatoria, Gafas grandes/pequeñas, Gato Frío/Térmico, Glúteos Pareja Frío/Térmico, Gorro, Gorro quimioterapia, Gota, Handy Frío/Térmico, Herbology, Hueso, Labios, Lumbar Frío/Térmico, Lumbar Mediana, Mano, Máscara Frío, Maxilofacial, Muela Frío/Térmico, Multiusos Frío/Térmico, Multiusos Grande, Multiusos Mediana, Pélvica, Pie, Pocket Frío/Térmico, Senos Pareja, Shoulder Frío/Térmico, Tiroides, Tapa Ojos, Orejas, Ojeras, Mariposas).

### Tareas

1. **Normalizar nombres en `stock_items` (Magical / cuerpos_referencias)**
   - Renombrar registros existentes para que coincidan con el listado:
     - `Caracol (Frío)` → `Caracoles`
     - `Glúteos (Frío)` → `Glúteos Pareja (Frío)`
     - `Glúteos (Térmico)` → `Gluteos Pareja termico`
     - `Máscara (Frío)` → `MASCARA FRIO`
     - `Senos (Frío)` → `Senos Pareja (Frío)`
   - Eliminar duplicados/variantes que ya no aplican (p.ej. `Antifaz (Térmico)`, `Senos (Térmico)`, etc., que no están en el listado).

2. **Actualizar `available` y `min_stock`** de las 49 referencias en `stock_items` con los valores de la imagen. Asegurar `product_type` correcto (Frío / Térmico) y `category = cuerpos_referencias`, `brand = magical`.

3. **Insertar las que faltan** en `stock_items` (ej. Orejas, Ojeras, Mariposas, Lumbar Mediana, Multiusos Grande/Mediana, Gorro quimioterapia, Gota, Mano, Pélvica, Pie, Faja Post. Operatoria, Tapa Ojos, etc. donde no exista).

4. **Limpiar y resincronizar `body_stock`** (la tabla que ven los asesores en el panel "Cuerpos disponibles"):
   - Borrar todos los registros con `brand = magical` (hoy hay duplicados y referencias obsoletas como "Handy" sin tipo, "Corazones", "Flores", "Muela Grande").
   - Insertar las 49 referencias del listado con su `available` correspondiente (un registro único por referencia).

5. **Verificación** vía `read_query`: confirmar que tanto `stock_items` como `body_stock` tienen exactamente las 49 referencias con los valores correctos, y revisar visualmente en `/inventarios` y en la vista de asesor.

### Notas técnicas

- Toda la operación es de datos (no de esquema): se ejecuta con la herramienta de inserción/actualización SQL, sin migraciones.
- No se toca código de UI: las vistas de asesor (`AsesorInventoryView`, `CategorizedInventoryPanel`) ya leen de estas tablas, así que los cambios se reflejan automáticamente.
- El indicador de "Crítico / Bajo / OK" usa `min_stock`, por lo que actualizar ese campo basta para que aparezcan correctamente en la pestaña de críticos.
- Sweatspot no se toca en este cambio.

### Pregunta abierta

El listado solo trae cantidades únicas (no separa "al por mayor" vs "al por menor"). Asumo que ambos canales de venta consultan el mismo stock de cuerpos (que es como funciona hoy). Si quieres llevar inventarios separados por canal, dímelo y lo planteamos como un cambio aparte (requiere columna nueva en `stock_items`).