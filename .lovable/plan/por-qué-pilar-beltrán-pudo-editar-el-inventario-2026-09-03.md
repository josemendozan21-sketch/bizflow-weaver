# Por qué Pilar Beltrán pudo editar el inventario

El historial está bien: los dos registros son reales y quedaron correctamente auditados (usuario, fecha, campo, valor anterior y nuevo). El problema son los permisos.

Lo verificado en la base de datos:

- Pilar Beltrán (beltran.pilar1923@gmail.com) tiene únicamente el rol **asesor comercial**.
- Existe una regla de acceso llamada "Advisors can view and update stock items" que permite a **cualquier asesor comercial modificar cualquier ítem de inventario** (incluida la cantidad disponible), sin ninguna restricción de escritura.
- Los dos cambios registrados son sobre "Mezcla Gel" (materia prima Magical): -488.480 → -492.230 → -495.230.
- El ítem "Mezcla Gel" quedó en **-495.230 unidades**, es decir, el sistema hoy permite dejar el inventario en negativo sin ninguna alerta ni bloqueo.

## Qué se va a corregir

1. **Quitar el permiso de edición a los asesores comerciales.** Los asesores seguirán viendo el inventario (necesario para vender), pero no podrán modificar cantidades ni datos de los ítems. La gestión queda en Admin, Inventarios, Producción y Estampación.
2. **Cerrar también las reglas incompletas de Producción, Estampación y Admin**, que hoy permiten editar sin validar el rol al momento de guardar (solo lo validan al leer). Quedarán validadas en ambos sentidos, igual que la de Inventarios.
3. **Ocultar los controles de edición en la interfaz** para los roles sin permiso: los botones de editar, agregar, eliminar y "producir mezcla" en Materia Prima e Inventario por categorías no se mostrarán a asesores, y se mostrará un mensaje de solo lectura.
4. **Bloquear cantidades negativas**: al guardar una cantidad disponible menor a cero se mostrará un error y no se guardará, salvo que un administrador confirme explícitamente el ajuste.
5. **Revisar el caso concreto de "Mezcla Gel"**: la cantidad actual (-495.230) es inconsistente. Se dejará a Inventarios un ajuste manual desde el panel, con el registro en la bitácora, en lugar de tocar el dato por detrás sin validación.

## Detalles técnicos

- Migración sobre `public.stock_items`: eliminar la política `Advisors can view and update stock items`; recrear `Admins/Production/Stamping can manage stock items` con `USING` y `WITH CHECK` sobre `has_role(...)`. Mantener `Authenticated users can view stock items` (SELECT) para que los asesores sigan consultando.
- Frontend: `MateriaPrimaPanel.tsx`, `CategorizedInventoryPanel.tsx` e `InventariosRoleView.tsx` reciben un flag `canManageStock` derivado del rol (`admin`, `inventarios`, `produccion`, `estampacion`) para condicionar los botones de alta/edición/eliminación y el flujo de producción de gel.
- Validación de negativos en `updateStockItem`/`addStockItem` antes del envío, con confirmación explícita solo para admin.
- La bitácora `inventory_audit_log` no cambia: ya registra correctamente y es de solo lectura para admin e inventarios.
