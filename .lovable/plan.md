

## Plan: Fix inventory discount on order creation + Confirm quantity before finalizing body production

### Problems identified

1. **Inventory not discounting on order creation**: When an advisor creates a wholesale order, `reserveBodyStockDB` is called and it does discount from `body_stock`. However, the `discountStockDB("gel", ...)` call searches `stock_items` by a partial name match for "gel" — this may not match properly if the DB item is named "Mezcla Gel" or similar. Need to verify and fix the matching logic so gel and other materials are actually discounted.

2. **Product names inconsistency ("Shoulder" → "Hombro")**: No translation exists in the codebase — all product names use "Shoulder", "Lumbar", etc. consistently in both the Zustand store and the database. The issue is likely from manual data entry. The fix is to ensure all product selectors across roles pull from the same canonical list (the `materialConfigs` or `stock_items` table) and never allow free-text entry where a dropdown should be used.

3. **Body production tasks: no quantity confirmation before finalizing**: Currently, clicking "Finalizar proceso" on a body task immediately marks it as `finalizado` without confirming the actual quantity produced. Need to add an intermediate step (dialog) to input the real quantity before updating `body_stock`.

---

### Changes

#### 1. Fix inventory discount during order creation (`src/hooks/useInventory.ts` + `src/pages/Ventas.tsx`)
- Review and fix the `discountStock` function's name matching to ensure "gel" matches the actual DB item name (e.g., "Mezcla Gel").
- Verify that `reserveBodyStock` properly matches the product reference format `"Shoulder (Frío)"` against `body_stock` entries like `"Shoulder (Frio)"` (accent differences).
- Add console logging or toast feedback when discount succeeds/fails so the advisor knows what happened.

#### 2. Standardize product names across all roles
- Ensure the product dropdown in the sales form, production views, and events all use the same canonical names from `materialConfigs` (which already has "Shoulder", not "Hombro").
- In `BodyProductionForm` (inside `MagicalWarmersWorkflow.tsx`), replace the free-text reference input with a dropdown of known product names from `materialConfigs` or `body_stock`, so operators can't accidentally type translated names.

#### 3. Add quantity confirmation dialog for body production tasks (`src/components/production/MagicalWarmersWorkflow.tsx` + `src/hooks/useProductionOrders.ts`)
- Add a confirmation dialog that appears when "Finalizar proceso" is clicked on a body task (status `en_proceso`).
- The dialog shows the original estimated quantity and an editable input for the actual quantity produced.
- Modify `updateBodyTaskStatus` mutation in `useProductionOrders.ts` to accept an optional `actualQuantity` parameter.
- When `status === "finalizado"` and `actualQuantity` is provided, upsert `body_stock` with the confirmed quantity (increment existing stock or create new entry).
- Similarly, modify `advanceStage` to accept `confirmedQuantity` for orders in `produccion_cuerpos` stage, and use that value instead of `po.quantity` when updating `body_stock`.

### Files to modify
- `src/hooks/useInventory.ts` — Fix name matching in `discountStock`
- `src/hooks/useProductionOrders.ts` — Add `actualQuantity` param to `updateBodyTaskStatus`, add body_stock upsert; add `confirmedQuantity` to `advanceStage`
- `src/components/production/MagicalWarmersWorkflow.tsx` — Add confirmation dialog for body tasks and production orders in cuerpos stage; replace free-text reference input with dropdown
- `src/pages/Ventas.tsx` — Ensure discount feedback is visible to the advisor

