# Marcación de ingreso y salida en la sede Chico (Punto de la 92)

Reutilizar la misma marcación con foto que ya usan Estampación, Producción y Logística, ahora con una cuarta sede: **Punto de la 92 (Chico)**.

## Qué verá el equipo
- En **Personal → Marcación de hoy** aparece una nueva pestaña **"Punto 92 (Chico)"**.
- La cuenta del Punto de la 92 entra directo a esa pestaña y puede marcar ingreso y salida con foto, igual que las demás áreas.
- Personal precargado, cada uno con su rol visible:
  1. Eliana Portillo — Vendedora principal (permanente)
  2. Juan Herrera — Vendedor de reemplazo / ausencias
  3. Daniela Muñoz — Vendedora de reemplazo / ausencias
- Botón **"Otro: registrar mi nombre"**: pide nombre y apellido, lo agrega como "Reemplazo / otro" y queda disponible para marcar de una vez (y en los días siguientes, sin volver a escribirlo).
- El **Reporte semanal** (admin) incluye la sede Chico con las horas de cada persona.
- La cuenta del Punto 92 también ve "Personal" en su menú.

## Detalles técnicos
- Migración: ampliar el CHECK de `staff_members.area` para incluir `punto_92`; añadir columna opcional `staff_role text` (vendedor principal / reemplazo / otro).
- Insertar los 3 nombres con `area='punto_92'`.
- Nueva política RLS: rol `pos_punto` puede INSERT en `staff_members` solo con `area='punto_92'` (el admin sigue gestionando todo). `staff_attendance` ya permite insertar/actualizar a usuarios autenticados.
- `Personal.tsx`: agregar `punto_92` al tipo `Area`, pestaña, área por defecto para `pos_punto`, mostrar `staff_role`, y diálogo "Otro" con nombre + apellido.
- Habilitar `/personal` para el rol `pos_punto` en la ruta protegida y el menú lateral.
