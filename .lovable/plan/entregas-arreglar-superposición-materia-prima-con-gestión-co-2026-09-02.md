# Entregas: arreglar superposición + Materia prima con gestión completa

## 1. Panel de entregas (Fechas de entrega > Entregas)

Hoy cada entrega usa una grilla fija de 5 columnas muy estrechas. Cuando el correo del asesor y el nombre del cliente son largos, los textos se montan uno encima del otro (como en la captura: "valemendoza2228@gmail.com" sobre "Sebastián Valenzuela").

Cambios, solo de presentación:
- Grilla responsiva: 1 columna en móvil, 2-3 en tablet, 5 en escritorio.
- Cada celda con ancho mínimo controlado y corte de texto limpio (sin desbordes ni solapamientos), con tooltip para ver el valor completo.
- Mostrar el nombre del asesor en vez del correo cuando exista; si solo hay correo, recortarlo de forma legible.
- Ajuste del badge de marca para que no empuje el contenido.

## 2. Materia prima al mismo nivel que referencias/productos

Hoy el panel de Materia Prima solo permite gestionar al rol Administrador y solo deja editar cantidad y mínimo. Referencias/productos ya tiene un flujo más completo.

Cambios:
- Permitir gestión también al rol Inventarios (igual que en el catálogo de referencias): crear, editar y eliminar materia prima. Los demás roles siguen en solo lectura.
- Edición completa de la materia prima, no solo cantidad y mínimo: nombre, marca (Magical / Sweatspot / Ambas), unidad, cantidad disponible y stock mínimo, mediante un diálogo de edición.
- Confirmación de eliminación con diálogo del sistema (en lugar del aviso nativo del navegador) y aviso si el ítem tiene movimientos asociados.
- Añadir dentro del panel de Materia Prima una pestaña "Historial de cambios" que reutiliza el historial de inventario ya existente, filtrado a la categoría Materia prima: muestra quién creó/editó/eliminó, qué campo cambió, valor anterior y nuevo, fecha, y permite exportar.

Los cambios de materia prima ya quedan registrados por el sistema de auditoría existente, así que no se requieren cambios en la base de datos.

## Detalles técnicos

- `src/pages/Eventos.tsx` (~líneas 511-548): reemplazar `grid grid-cols-5 gap-4` por `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`, agregar `min-w-0` en el contenedor y `truncate` + `title` en cada valor; `shrink-0` en el badge de marca.
- `src/components/inventory/MateriaPrimaPanel.tsx`: `isReadOnly = role !== "admin" && role !== "inventarios"`; nuevo diálogo de edición con name/brand/unit/available/min_stock vía `updateStockItem`; `AlertDialog` para borrado; envolver el contenido en `Tabs` ("Listado" / "Historial de cambios").
- `src/components/inventory/InventoryChangeLogPanel.tsx`: aceptar prop opcional `category` para prefiltrar a `materia_prima` y ocultar el filtro de categoría en ese modo; sin cambios de comportamiento donde ya se usa.
- Sin migraciones ni cambios de RLS.
