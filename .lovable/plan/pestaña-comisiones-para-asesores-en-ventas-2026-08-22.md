# Pestaña "Comisiones" para asesores en Ventas

Cada asesor podrá ver, dentro de Ventas, cómo va su comisión del mes a medida que monta pedidos, separando lo ya facturado de lo pendiente por facturar (que no depende de ellos).

## Qué verá el asesor

Nueva pestaña **Comisiones** en `/ventas` (junto a Nuevo Pedido, Mis Pedidos, Cotizaciones, Resumen, Calendario), con selector de mes/año y solo con sus propios pedidos.

Tarjetas de resumen:
- Total montado en el mes (con IVA) y número de pedidos.
- Facturado: monto y comisión ya causada (base oficial de pago).
- Pendiente por facturar: monto y comisión estimada de esos pedidos.
- Comisión proyectada total = facturada + pendiente, más bonos proyectados.

Indicadores de política:
- Progreso hacia bono $150.000 (desde $10M), desbloqueo fin de semana (desde $15M) y bono adicional $100.000 (desde $18M), con barra de avance.
- Aviso claro: "el pago se liquida sobre pedidos facturados; los pendientes por facturar se pagan cuando contabilidad los facture".

Detalle de pedidos: tabla con cliente, fecha, tipo (mayor/detal), nuevo/recompra, valor con IVA, base sin IVA, % aplicado, comisión, y estado (Facturado / Pendiente por facturar / Devuelto). Filtro rápido por estado.

## Quién la ve

- Visible para asesores comerciales y admin.
- Oculta para el usuario de Ilian Hernández (`ilianghernandez@gmail.com`), que no entra en el esquema de comisiones.

## Detalles técnicos

- `src/lib/commissions.ts`: agregar `summarizeAdvisorProgress(orders, year, month, advisorId?)` reutilizando `getCommissionRate` y las constantes existentes. A diferencia de `summarizeAdvisorMonth`, no filtra por `invoice_status = 'facturado'`: agrupa todos los pedidos del mes por fecha (`invoice_date` si existe, si no `created_at`) y marca cada línea con `invoiced: boolean`. Devuelve totales separados (facturado / pendiente / total) y los bonos calculados sobre facturado y sobre total (proyección). Sin cambios en `summarizeAdvisorMonth` para no alterar la liquidación de contabilidad.
- Nuevo componente `src/components/ventas/MisComisiones.tsx`, alimentado por `useOrders()` (ya filtra por `advisor_id` para asesores vía RLS) y con filtro adicional por el usuario actual cuando el rol es admin visualizando su propio perfil.
- `src/pages/Ventas.tsx`: nuevo `TabsTrigger`/`TabsContent` "Comisiones" renderizado condicionalmente según el correo del usuario autenticado (excluir Ilian) — se obtiene con la sesión actual de Supabase.
- Sin cambios de base de datos; solo lectura de `orders` (`invoice_status`, `invoice_date`, `total_amount`, `sale_type`, `is_recompra`, `returned_at`).
