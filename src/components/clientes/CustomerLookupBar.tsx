import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Customer, useCustomerLookup } from "@/hooks/useCustomers";
import { CustomerSummaryCard } from "./CustomerSummaryCard";
import { CreateCustomerDialog } from "./CreateCustomerDialog";

type Props = {
  customer: Customer | null;
  onCustomerChange: (c: Customer | null) => void;
};

export function CustomerLookupBar({ customer, onCustomerChange }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const lookup = useCustomerLookup(customer ? null : debounced || null);
  const found = lookup.data;
  const searched = debounced.length >= 4 && !lookup.isLoading;

  // Auto-select on exact match
  useEffect(() => {
    if (found && !customer) {
      onCustomerChange(found);
      setQuery("");
    }
  }, [found, customer, onCustomerChange]);

  if (customer) {
    return <CustomerSummaryCard customer={customer} onClear={() => onCustomerChange(null)} />;
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <Label className="text-xs font-semibold">Cliente</Label>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cédula o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
          autoComplete="off"
        />
        {lookup.isLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {searched && !found && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Cliente no encontrado.</span>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Crear cliente nuevo
          </Button>
        </div>
      )}
      {!searched && (
        <p className="text-[11px] text-muted-foreground">Busca por cédula o teléfono, o crea uno nuevo.</p>
      )}
      <CreateCustomerDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        initialDocument={/^\d{6,}$/.test(debounced) ? debounced : undefined}
        initialPhone={/^\d{7,}$/.test(debounced) ? debounced : undefined}
        onCreated={(c) => {
          onCustomerChange(c);
          setQuery("");
        }}
      />
    </div>
  );
}