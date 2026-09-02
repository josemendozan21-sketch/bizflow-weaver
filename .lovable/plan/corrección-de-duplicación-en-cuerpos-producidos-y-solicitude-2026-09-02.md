# Corrección de duplicación en cuerpos producidos y solicitudes que desaparecen

## Qué encontré (verificado en código y datos)

**1. La duplicación NO viene de reservas. Viene de la confirmación de recepción.**

Cuando Inventarios confirma la recepción de los cuerpos fabricados, el sistema suma la cantidad dos veces:

```text
Inventarios confirma 1000 gafas
  -> el código suma 1000 al inventario de productos (stock_items)
  -> un automatismo de la base de datos copia ese valor a cuerpos (body_stock)  = ya quedó sumado
  -> el código vuelve a sumar 1000 a cuerpos (body_stock)                        = 2000
  -> el automatismo copia de vuelta cuerpos -> productos                         = 2000
```

Resultado: 1000 producidas quedan como 2000 en ambos lados. Coincide con lo que reportan los usuarios y con la evidencia: existe un ajuste manual registrado el 27/08 con el motivo literal "se duplico cuando se confirmo de producción" (-200 uds de Máscara).

**2. Los dos inventarios de cuerpos están desincronizados hoy.** Ejemplos actuales: Handy (Frío) 14.995 en cuerpos vs 12.995 en productos; Máscara (Frío) 418 vs 167; Muela (Frío) 2.296 vs 2.236; Gafas pequeñas 2.293 vs 2.302. Son secuelas de la doble suma y de salidas que no se reflejaron en ambos lados.

**3. El botón de confirmar recepción no está protegido.** Si se hace doble clic o se confirma dos veces antes de que refresque, vuelve a sumar. No hay verificación de "esta entrada ya fue recibida".

**4. Existe una segunda vía de finalización que también suma stock**, en paralelo a la vía oficial (finalizar -> pendiente de recepción -> Inventarios confirma). Esa vía antigua escribe directo en cuerpos sin pasar por recepción; si se dispara, duplica.

**5. Por qué "desaparecen" las solicitudes en producción:**
- La tabla de tareas de cuerpos no guarda la marca. La pantalla de tareas solo existe en el flujo de Magical Warmers, así que una solicitud creada con marca Sweatspot se guarda pero nadie la ve nunca.
- La tarjeta tiene una "X" de eliminar sin confirmación registrada en ningún historial: si alguien la borra, desaparece sin rastro.
- Al finalizar, la tarea se mueve a la sección de finalizadas; si el registro de entrada a inventario falla, la tarea igual queda finalizada y el usuario cree que se perdió.

## Qué voy a hacer

### A. Eliminar la doble suma (causa raíz)
- La confirmación de recepción sumará la cantidad **una sola vez**, en un solo lugar, dejando que la sincronización automática entre cuerpos y productos haga el resto. Se elimina la segunda suma manual.
- Se conserva el descuento de "en proceso" y la creación de la referencia cuando no existe.

### B. Hacer la confirmación a prueba de doble clic
- Antes de sumar, se verifica que el movimiento siga marcado como pendiente; si ya fue recibido, se muestra un aviso y no suma nada.
- El botón se bloquea mientras se procesa.

### C. Cerrar la vía duplicada de finalización
- Se deshabilita la ruta antigua que escribía stock directo desde producción. Queda una única ruta: Producción finaliza -> queda pendiente de recepción -> Inventarios confirma -> entra al inventario.

### D. Que las solicitudes no se pierdan
- Agregar marca a las tareas de cuerpos, para que las solicitudes de Sweatspot también se vean en su área y no queden invisibles.
- La eliminación de una tarea quedará registrada en el historial de cambios (quién, cuándo, qué referencia y cantidad) y se restringe a Inventarios/Admin.
- Si al finalizar no se logra registrar la entrada a inventario, la tarea vuelve a quedar pendiente en vez de darse por finalizada.

### E. Corregir los saldos actuales
- Antes de tocar nada, generar un comparativo cuerpos vs productos de todas las referencias de Magical y presentarlo. **No ajusto ninguna cantidad sin tu visto bueno referencia por referencia**, porque parte de la diferencia puede ser salida real no registrada.

## Detalles técnicos

- Confirmación de recepción: `src/components/inventory/MovementHistoryTable.tsx` (líneas ~76-121) — quitar el bloque que actualiza `body_stock` manualmente; los triggers `mirror_stock_items_to_body_stock` / `mirror_body_stock_to_stock_items` ya propagan el valor. Añadir relectura de `reception_confirmed` con guardia previa.
- Vía duplicada: `useProductionOrders.ts` `updateBodyTaskStatus` (líneas 749-783) — retirar el upsert a `body_stock`.
- Marca en tareas: migración para añadir `brand text not null default 'magical'` a `body_production_tasks`; ajustar `RequestBodyProductionDialog.tsx` y el filtro de `useProductionOrders`.
- Borrado auditado: registrar la eliminación en `inventory_audit_log` y condicionar el botón al rol.
- Finalización: en `MagicalWarmersWorkflow.tsx` (líneas 545-611), revertir el estado de la tarea a `pendiente` si falla el insert del movimiento.
- No se modifica la lógica de reservas en backend (sigue oculta en el frontend).
