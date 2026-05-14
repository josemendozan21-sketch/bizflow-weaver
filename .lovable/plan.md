## Mejoras al módulo Reportes en Puntos de Venta

### 1. Pestaña "Ventas del día" en Reportes

Reorganizar `PuntoReportes.tsx` con sub-tabs:

- **Resumen** (lo actual): tarjetas KPI + métodos de pago + últimas ventas
- **Ventas del día** (nueva): tabla filtrable por fecha (default = hoy) que muestra cada venta con cliente, documento, ítems, total, método de pago, tipo (Factura DIAN o Remisión) y acciones de descarga
- **Movimientos** (lo actual)
- **Retiros de caja** (nueva)

### 2. Clasificación Factura DIAN vs Remisión

Regla automática según método de pago:
- `efectivo` o `nequi` → **Remisión** (no se envía a DIAN)
- Cualquier otro (`tarjeta`, `transferencia`, `otro`) → **Factura DIAN**
- Pagos divididos (`efectivo+tarjeta`, etc.): si incluye un método "DIAN" → factura; si todos son efectivo/nequi → remisión

Se calcula en el frontend a partir de `payment_method`. No requiere cambio de esquema.

### 3. Descarga de documentos

- **PDF individual por venta**: botón "Descargar" en cada fila. Genera PDF con `jspdf` (ya disponible o se agrega) con encabezado del local, datos del cliente, ítems, totales, método de pago, y leyenda "FACTURA DE VENTA" o "REMISIÓN" según tipo.
- **CSV resumen del día**: botón "Descargar CSV del día" que exporta todas las ventas filtradas (fecha, cliente, NIT, total, método, tipo, ítems concatenados). Útil para enviar a DIAN.
- **Descarga masiva de PDFs**: botón "Descargar todas las facturas DIAN del día" → ZIP con los PDFs solo de tipo Factura.

### 4. KPIs de caja acumulada

En el panel Resumen, agregar:
- **Total acumulado en caja** (ventas en efectivo del día − retiros del día)
- **Total tarjeta del día**, **Total Nequi**, **Total transferencia**
- **Acumulado histórico por método** (selector de rango: hoy / semana / mes)

### 5. Retiros de caja

Nueva tabla `pos_cash_withdrawals` con:
- `location_id`, `amount`, `concept` (qué se retira), `requested_by_name` (quién/motivo), `proof_url`, `status` (`pendiente`/`aprobado`/`rechazado`), `requested_by`, `approved_by`, `approved_at`, `rejection_reason`, `created_at`

Bucket de Storage `pos-cash-proofs` (público) para los soportes.

RLS:
- POS asignado al punto: insertar y ver propios retiros (estado = pendiente)
- Admin/Contabilidad: ver todos, aprobar, rechazar

UI dentro de la nueva sub-tab **Retiros de caja**:
- Botón "Registrar retiro" (form: monto, concepto, persona/motivo, soporte adjunto)
- Listado con estado, monto, concepto, soporte (link), botones aprobar/rechazar (solo admin)
- Los retiros aprobados se descuentan del acumulado en efectivo de los KPIs

### 6. Archivos afectados

**Nuevos:**
- `supabase/migrations/<timestamp>_pos_cash_withdrawals.sql` (tabla + RLS + bucket)
- `src/components/puntos-venta/PuntoVentasDelDia.tsx` (tabla + descargas)
- `src/components/puntos-venta/PuntoRetiros.tsx` (form + listado + aprobación)
- `src/lib/posInvoicePdf.ts` (genera PDF factura/remisión con jsPDF)
- `src/lib/posExports.ts` (CSV del día + ZIP de PDFs con `jszip`)

**Editados:**
- `src/hooks/usePuntosVenta.ts` (hooks `usePosCashWithdrawals`, `useCreateWithdrawal`, `useApproveWithdrawal`, helper `uploadCashProof`, helper `classifySaleType`)
- `src/components/puntos-venta/PuntoReportes.tsx` (sub-tabs + KPI ajustado por retiros)
- `src/integrations/supabase/types.ts` (auto)

### Detalles técnicos

Dependencias a agregar: `jspdf`, `jspdf-autotable`, `jszip` (todas npm, sin claves).

Permisos:
- `useAuth().role === 'pos_punto'` → puede crear retiros y ver propios
- `useAuth().role === 'admin' | 'contabilidad'` → aprueba/rechaza, ve todos

El cálculo de "tipo" se hace con un helper:
```ts
const isRemision = (method: string | null) => {
  const parts = (method ?? "").toLowerCase().split("+");
  return parts.length > 0 && parts.every(p => p === "efectivo" || p === "nequi");
};
```

