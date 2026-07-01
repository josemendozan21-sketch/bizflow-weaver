
## Objetivo
Que los vendedores de feria puedan seguir trabajando **sin internet**: ver inventario, registrar ventas y consultar sus ventas del día. Cuando vuelva la red, todo se sube automáticamente. Si dos vendedores venden el mismo producto y no alcanza, la venta **igual se registra** y queda marcada como **sobreventa** para revisar.

## Qué va a ver el usuario

1. **Indicador de conexión** arriba a la derecha del POS: verde "En línea" / naranja "Sin conexión — N ventas pendientes".
2. Cuando esté offline puede:
   - Abrir la app (queda instalada como PWA)
   - Ver los productos despachados y sus precios
   - Registrar ventas por método de pago
   - Consultar "Mis ventas" del día
3. Al recuperar internet: se suben las ventas en segundo plano, aparece un toast "Se sincronizaron N ventas" y las que causaron sobreinventario quedan con una etiqueta **⚠ Sobreventa** en la lista.

## Cómo se implementa (técnico)

### 1. Instalable + offline shell (PWA)
- Instalar `vite-plugin-pwa` con `generateSW`, `registerType: "autoUpdate"`, `injectRegister: null`.
- `NetworkFirst` para navegaciones, `CacheFirst` sólo para assets hasheados. Excluir `/~oauth`.
- Manifest con nombre "Bionovations POS", ícono, `display: standalone`.
- **Registro guardado** en `src/pwa/register.ts`: nunca en preview/dev/iframe/`?sw=off`, sólo en producción.
- Aprovechar los `public/sw.js` y `public/service-worker.js` existentes como kill-switch previo (ya están) → el plugin los reemplaza al build.

### 2. Cache de datos de la feria (para leer offline)
- Nuevo hook `useOfflineFeriaCache(feriaId)` que:
  - Guarda en `localStorage` (clave `feria_cache_<id>`) el snapshot de `ferias`, `feria_inventory`, `feria_sales` del usuario cada vez que llegan datos frescos.
  - `useFerias`, `useFeriaInventory`, `useFeriaSales` leen del cache como `initialData` cuando no hay respuesta del servidor.

### 3. Cola local de ventas (outbox)
- Nuevo store `src/stores/feriaOfflineStore.ts` (zustand + `persist` en localStorage):
  - `pendingSales: PendingSale[]` con `{ localId, feria_id, brand, product_name, quantity, unit_price, total_amount, payment_method, client_name, notes, sale_date, recorded_by, status: 'pending'|'syncing'|'synced'|'error', synced_id?, oversold? }`.
  - Acciones: `enqueue`, `markSynced`, `markOversold`, `remove`.
- Al registrar venta:
  1. Si `navigator.onLine` → intento normal Supabase. Si falla → encola.
  2. Si offline → encola directo, aplica descuento **optimista** en el cache local de `feria_inventory` (`quantity_dispatched - quantity_sold`), muestra en "Mis ventas" con badge "Pendiente".
- Nuevo componente `OfflineSalesBadge` en `FeriaPOS.tsx` con el estado y contador.

### 4. Sincronizador
- Nuevo `src/hooks/useOfflineSalesSync.ts` montado en `FeriaPOS.tsx`:
  - Escucha `online`/`offline` y corre cada 15 s cuando hay pendientes.
  - Envía cada venta a `feria_sales.insert`. Si el insert respondió OK → `markSynced` con el id retornado.
  - Detecta **sobreventa**: después del insert, si `quantity_dispatched - SUM(quantity_sold) < 0` para ese producto → marca `oversold=true` y añade `notes: "[SOBREVENTA] " + notes`. Además dispara una notificación (`notifications` con `target_role='logistica'`).
  - Toast con el resumen al terminar cada tanda.

### 5. Ajustes de UI
- `QuickSaleGrid` y `DetailedSaleForm`: usar `enqueueSale` en vez de `useAddFeriaSale` directo; deshabilitar bloqueos que exijan stock > 0 cuando estamos offline (se permite sobreventa).
- `MySalesTab` y `FeriaInventoryStatus`: mezclar `sales` remotas con `pendingSales` locales; badge de estado por fila.

### 6. Notas y límites
- Solo aplica a `/feria-pos` (los vendedores). Las demás vistas siguen requiriendo red.
- Datos sensibles (payment methods, precios) quedan en localStorage del dispositivo — aceptable porque ya son datos del vendedor y del cliente puntual.
- Offline funciona sólo en la **app publicada** (no en el preview de Lovable). Se avisará al vendedor la primera vez.
- Sobreventa: se acepta y se marca. Contabilidad/logística verá la etiqueta y notificación para reponer.

## Archivos que voy a tocar/crear
**Crear:** `vite.config.ts` (añadir plugin), `src/pwa/register.ts`, `public/manifest.webmanifest`, `src/stores/feriaOfflineStore.ts`, `src/hooks/useOfflineFeriaCache.ts`, `src/hooks/useOfflineSalesSync.ts`, `src/components/feria-pos/OfflineIndicator.tsx`.
**Modificar:** `src/main.tsx` (importar wrapper), `index.html` (manifest + theme-color), `src/pages/FeriaPOS.tsx`, `src/components/feria-pos/QuickSaleGrid.tsx`, `src/components/feria-pos/DetailedSaleForm.tsx`, `src/components/feria-pos/MySalesTab.tsx`, `src/components/feria-pos/FeriaInventoryStatus.tsx`, `src/hooks/useFerias.ts` (initialData del cache).

¿Le doy con esto?
