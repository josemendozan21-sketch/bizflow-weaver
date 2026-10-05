# Que Contabilidad y Visualizador vean el personal de Chico (Punto de la 92)

## Por qué no lo ven hoy
- **Visualizador:** la base de datos no le da permiso de lectura a ese usuario sobre los puntos de venta (ni sedes, ni productos, ni ventas). Por eso dice "No hay puntos de venta creados", aunque sí existen.
- **Contabilidad:** entra al punto, pero la pestaña "Ingreso y salida" solo se muestra a la cuenta del Punto 92 y al administrador. Y en el menú **Personal**, a cualquier usuario que no sea administrador se le muestra por defecto Producción, sin pestañas para cambiar de sede ni reporte semanal.

## Qué va a cambiar
1. **Visualizador ve los puntos de venta** en solo lectura: inventario, reportes, calendario, historial y caja del Punto de la 92, igual que Contabilidad.
2. **En Puntos de Venta → Punto de la 92**, Contabilidad y Visualizador también verán la pestaña **"Ingreso y salida"**, en modo consulta.
3. **En el menú Personal**, Contabilidad y Visualizador verán:
   - Las pestañas de sede: Estampación, Producción, **Punto 92 (Chico)** y Logística.
   - Quién marcó hoy, la hora de ingreso y de salida, y la foto.
   - El **Reporte semanal** con las horas de cada persona, incluida la sede Chico.
4. **Solo consulta:** estas dos cuentas no podrán marcar ingreso o salida ni agregar personas ("Otro: registrar mi nombre" no aparece para ellas). La cuenta del Punto 92 y las demás áreas siguen igual que antes.

## Detalles técnicos
- Migración: políticas SELECT para `has_role(auth.uid(),'visualizador')` en `pos_locations`, `pos_products`, `pos_sales`, `pos_sale_items`, `pos_inventory_movements`, `pos_calendar_events`, `pos_cash_withdrawals`, `pos_location_assignments`, `pos_product_audit_log`, `pos_sale_audit_log` (y tablas de caja menor del punto si las usa la pestaña Caja).
- `PuntosVenta.tsx`: `readOnly = isContabilidad || isVisualizador`; la pestaña "personal" se muestra también a contabilidad y visualizador, y le pasa `readOnly` a `<Personal />`.
- `Personal.tsx`: `canViewAll = isAdmin || contabilidad || visualizador` → selector de sede y Reporte semanal; prop/flag `readOnly` (contabilidad/visualizador) que oculta los botones de marcación y `AddOtherStaff` en `StaffCard`/`TodayMarking`. Dentro de Puntos de Venta abre directo en la pestaña Punto 92.
- `staff_members`/`staff_attendance` ya permiten lectura a cualquier usuario autenticado; no requieren cambios.
