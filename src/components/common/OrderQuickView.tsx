import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import OrderDetailDialog from "@/components/common/OrderDetailDialog";
import OrderSearchDialog from "@/components/common/OrderSearchDialog";

interface QuickViewCtx {
  /** Abre la ficha completa de un pedido por id (preferido) o por número */
  openOrder: (params: { id?: string | null; code?: string | null }) => void;
  /** Abre el buscador global de pedidos */
  openSearch: () => void;
}

const Ctx = createContext<QuickViewCtx | null>(null);

export function useOrderQuickView() {
  return useContext(Ctx);
}

export function OrderQuickViewProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<{ id?: string | null; code?: string | null } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const openOrder = useCallback((params: { id?: string | null; code?: string | null }) => {
    if (!params.id && !params.code) return;
    setTarget(params);
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  const value = useMemo(() => ({ openOrder, openSearch }), [openOrder, openSearch]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <OrderSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(id) => {
          setSearchOpen(false);
          setTarget({ id });
        }}
      />
      <OrderDetailDialog
        orderId={target?.id ?? undefined}
        orderCode={target?.code ?? undefined}
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
      />
    </Ctx.Provider>
  );
}
