import { Fragment, useState, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
 * Tabla de inventario agrupada por la faceta macro activa. Se usa igual en
 * Magical y Sweatspot para que la experiencia sea idéntica.
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
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }

  const showHeaders = !(groups.length === 1 && groups[0].key === "__all__");

  return (
    <div className="rounded-md border overflow-auto max-h-[65vh]">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_hsl(var(--border))]">
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(col.align === "right" && "text-right", col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const isCollapsed = !!collapsed[group.key];
            return (
              <Fragment key={group.key}>
                {showHeaders && (
                  <TableRow className="bg-muted hover:bg-muted sticky top-[41px] z-10">
                    <TableCell colSpan={columns.length} className="py-2 bg-muted">

                      <button
                        type="button"
                        className="flex items-center gap-2 text-sm font-semibold w-full text-left"
                        onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        {group.label}
                        <span className="text-xs font-normal text-muted-foreground">
                          {group.items.length} referencia{group.items.length === 1 ? "" : "s"} ·{" "}
                          {group.units.toLocaleString("es-CO")} unidades
                        </span>
                      </button>
                    </TableCell>
                  </TableRow>
                )}
                {!isCollapsed &&
                  group.items.map((item) => (
                    <TableRow key={getRowKey(item)} className={getRowClassName?.(item)}>
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={cn(col.align === "right" && "text-right", col.className)}
                        >
                          {col.render(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
