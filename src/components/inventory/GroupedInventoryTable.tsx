import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InventoryColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (item: T) => ReactNode;
  className?: string;
}

export interface InventoryGroup<T> {
  key: string;
  label: string;
  items: T[];
  units: number;
}

interface GroupedInventoryTableProps<T> {
  groups: InventoryGroup<T>[];
  columns: InventoryColumn<T>[];
  getRowKey: (item: T) => string;
  getRowClassName?: (item: T) => string;
  emptyMessage?: string;
}

/**
 * Tabla agrupada por la faceta macro activa. Estilo minimalista: separadores
 * finos, sin cajas ni fondos saturados.
 */
export default function GroupedInventoryTable<T>({
  groups,
  columns,
  getRowKey,
  getRowClassName,
  emptyMessage = "No hay productos con estos filtros.",
}: GroupedInventoryTableProps<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (groups.length === 0 || groups.every((g) => g.items.length === 0)) {
    return <p className="text-sm text-muted-foreground py-10 text-center">{emptyMessage}</p>;
  }

  const showHeaders = !(groups.length === 1 && groups[0].key === "__all__");

  return (
    <div className="overflow-x-auto md:overflow-x-visible">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="hover:bg-transparent border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "sticky top-[76px] z-20 bg-background h-9 border-b px-4 text-left align-middle text-[11px] font-normal uppercase tracking-wide text-muted-foreground",
                  col.align === "right" && "text-right",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isCollapsed = !!collapsed[group.key];
            return (
              <Fragment key={group.key}>
                {showHeaders && (
                  <tr className="border-0 hover:bg-transparent">
                    <td
                      colSpan={columns.length}
                      className="sticky top-[112px] z-10 bg-background pt-6 pb-1"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 text-left group"
                        onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium uppercase tracking-wide">{group.label}</span>
                        <span className="text-xs font-normal text-muted-foreground tabular-nums">
                          · {group.items.length} ref{group.items.length === 1 ? "" : "s"} · total del
                          grupo {group.units.toLocaleString("es-CO")} u
                        </span>
                      </button>
                    </td>
                  </tr>
                )}
                {!isCollapsed &&
                  group.items.map((item) => (
                    <tr
                      key={getRowKey(item)}
                      className={cn("border-b border-border/40 hover:bg-muted/40", getRowClassName?.(item))}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn("px-4 py-2.5 align-middle", col.align === "right" && "text-right", col.className)}
                        >
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
