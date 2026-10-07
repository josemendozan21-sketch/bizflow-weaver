# Registro de personal nuevo en Toberín (Producción)

## Qué verá el equipo
- Se agrega **Jeison David Suarez Gomez** a Producción para que marque ingreso y salida desde hoy.
- En **Personal → Producción** (y también en Estampación y Logística, que están en Toberín) aparece el botón **"Otro: registrar mi nombre"**, igual que en Chico. Pide nombre y apellido, agrega a la persona a esa área y la deja lista para marcar ese mismo día y los siguientes.
- La marcación de Toberín sigue igual que hoy: con foto y las mismas opciones. Solo se suma el botón.
- Contabilidad y Visualizador siguen solo consultando y no ven el botón.
- La persona nueva sale en el Reporte semanal con sus horas.

## Detalles técnicos
- Insertar en `staff_members`: full_name "Sergio Andres Romero Chaves", area 'produccion', staff_role 'Nuevo / otro'.
- RLS: cambiar la política INSERT para que cada rol pueda insertar en su área (`produccion`→produccion, `estampacion`→estampacion, `logistica`→logistica, `pos_punto`→punto_92, admin cualquiera).
- `Personal.tsx`: mostrar `AddOtherStaff` en todas las áreas cuando `!readOnly`, pasarle `area` como prop en vez de 'punto_92' fijo.
