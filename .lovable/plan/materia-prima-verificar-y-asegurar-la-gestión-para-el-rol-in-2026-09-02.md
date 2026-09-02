# Materia prima: verificar y asegurar la gestión para el rol Inventario

## Qué encontré

- El usuario `inventarios1@bionovationsas.com` tiene únicamente el rol `inventarios`.
- La base de datos ya permite a ese rol crear, editar y eliminar materia prima.
- En el código actual, el panel de Materia Prima habilita los botones para Admin e Inventario, y está montado en la pestaña "Materia Prima" de la vista del rol Inventario.

Conclusión: el cambio está en el código, pero la versión publicada de la app todavía no lo incluye, así que quien entre por el enlace en vivo sigue viendo la versión anterior sin los botones. Esto no está confirmado al 100% (no pude iniciar sesión como el usuario de Inventario), por eso el primer paso del plan es verificarlo.

## Plan

1. Verificar en la vista previa, con la sesión del rol Inventario, que en Inventarios > Materia Prima aparezcan: botón "Agregar materia prima", ícono de editar y ícono de eliminar por fila, y la sub-pestaña "Historial de cambios".
2. Publicar la app para que la versión en vivo quede igual que la vista previa.
3. Hacer el permiso más robusto para que no dependa de un solo valor de rol: usar la misma verificación de permisos de inventario que ya emplea el catálogo de productos, de modo que Admin e Inventario siempre vean las acciones.
4. Añadir un aviso claro cuando el usuario sí esté en modo solo lectura ("Tu rol no permite editar materia prima"), para que no se confunda "no tengo permiso" con "la función no existe".
5. Si tras publicar el usuario de Inventario sigue sin ver los botones, revisar con el navegador la sesión real: qué rol devuelve el sistema para esa cuenta y si hay algún error en consola al cargar el panel; corregir según lo que muestre.

## Detalle técnico

- `src/components/inventory/MateriaPrimaPanel.tsx`: reemplazar `isReadOnly = role !== "admin" && role !== "inventarios"` por un helper compartido de permisos de inventario, y añadir el aviso de solo lectura en el encabezado de la tarjeta.
- Sin migraciones ni cambios de políticas de acceso: las reglas de la base ya contemplan `inventarios`.
- Publicación mediante el flujo normal de Lovable.
