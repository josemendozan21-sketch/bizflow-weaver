# Presupuesto de ingresos y gastos del Punto 92

## Qué se verá
En la página de Presupuesto aparece un selector arriba: **General (empresa)** o **Punto 92**. Al elegir Punto 92, las pestañas Mes, Anual y Cuentas muestran solo las cuentas del punto, con la misma forma de hoy:
- **Ingresos**: ventas del punto, devoluciones y descuentos (presupuesto vs real por mes).
- **Gastos**: arriendo del local, personal, servicios, publicidad, etc.
- **Resultado del mes**: ingresos reales menos gastos reales, y lo mismo para el presupuesto.

Contabilidad o administración pueden crear y editar las cuentas del punto y digitar los valores mes a mes. Las cifras del punto no se suman a las de la empresa, para no contar nada dos veces.

## Ayuda automática (opcional, se muestra al lado)
En la cuenta de ventas del punto se muestra como referencia lo que registró la caja del Punto 92 ese mes, para comparar con el valor contable. No reemplaza lo que digite Contabilidad.

## Cuentas iniciales sugeridas
Se crean vacías: 4135 Ventas Punto 92, 4175 Devoluciones, 4210 Descuentos, Arrendamiento local, Laboral ventas, Servicios (luz, agua, teléfono), Aseo y cafetería, Publicidad, Comisiones, Otros gastos. Contabilidad puede ajustarlas.

## Pendiente de Contabilidad
Si tienen una plantilla con cifras 2026 del punto (como la de ingresos), la cargo igual que hice con la general.

## Detalles técnicos
- Agregar columna opcional `pos_location_id` a `accounting_accounts` (nula = cuenta general). Las cuentas del punto apuntan a "Sweatspot 92 POS". La restricción única pasa a (pos_location_id, group_code, name).
- Hooks filtran cuentas por ámbito; totales y exportaciones de Excel respetan el ámbito y separan ingresos de costos/gastos.
- Referencia de caja: suma mensual de `pos_sales` del punto (sin anuladas), solo lectura.
- Sin cambios de permisos: mismas reglas actuales de las tablas de presupuesto.
