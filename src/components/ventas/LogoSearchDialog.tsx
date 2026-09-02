import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { LogoPreview } from "@/components/diseno/LogoPreview";
import { useLogoSearch } from "@/hooks/useLogoSearch";
import { Check, Loader2, Search } from "lucide-react";

interface Props {
  clientName: string;
  brand?: string | null;
  selectedUrl?: string;
  onSelect: (url: string) => void;
  triggerLabel?: string;
}

export function LogoSearchDialog({ clientName, brand = null, selectedUrl, onSelect, triggerLabel = "Buscar logo del cliente" }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [onlyClient, setOnlyClient] = useState(true);
  const [brandFilter, setBrandFilter] = useState<string | null>(brand);

  useEffect(() => {
    if (open) {
      setTerm("");
      setOnlyClient(clientName.trim().length >= 3);
      setBrandFilter(brand);
    }
  }, [open, clientName, brand]);

  const { items, isLoading } = useLogoSearch({
    term,
    clientName,
    brand: brandFilter,
    onlyClient,
    enabled: open,
  });

  const brandOptions: { label: string; value: string | null }[] = [
    { label: "Todas", value: null },
    { label: "Magical", value: "Magical" },
    { label: "Sweatspot", value: "Sweatspot" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <Search className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buscar logo ya trabajado</DialogTitle>
          <DialogDescription>
            Busque por cliente, marca, nombre del logo o producto. Si no encuentra el logo, cierre y adjunte el archivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="logo-search-term">Búsqueda</Label>
            <Input
              id="logo-search-term"
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={clientName.trim() ? `Ej: ${clientName.trim()}` : "Cliente, marca, producto o nombre del logo"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {brandOptions.map((o) => (
              <Button
                key={o.label}
                type="button"
                size="sm"
                variant={brandFilter === o.value ? "default" : "outline"}
                onClick={() => setBrandFilter(o.value)}
              >
                {o.label}
              </Button>
            ))}
            {clientName.trim().length >= 3 && (
              <Button
                type="button"
                size="sm"
                variant={onlyClient ? "default" : "outline"}
                onClick={() => setOnlyClient((v) => !v)}
              >
                Solo de este cliente
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Buscando logos…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No se encontraron logos con ese criterio. Pruebe con otro nombre (marca, producto) o adjunte el archivo del logo en el formulario.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-lg border p-3 space-y-2 ${selectedUrl === r.url ? "border-primary ring-1 ring-primary" : "border-input"}`}
                >
                  <LogoPreview url={r.url} alt={r.logoName} maxHeightClass="max-h-28" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-tight break-words">{r.logoName}</p>
                    <p className="text-xs text-muted-foreground break-words">{r.clientName || "Sin cliente"}</p>
                    <div className="flex flex-wrap gap-1">
                      {r.brand && <Badge variant="outline" className="text-[10px]">{r.brand}</Badge>}
                      <Badge variant="secondary" className="text-[10px]">
                        {r.source === "diseno" ? "Diseño" : "Pedido"}
                      </Badge>
                      {r.createdAt && (
                        <Badge variant="outline" className="text-[10px]">
                          {new Date(r.createdAt).toLocaleDateString("es-CO")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    variant={selectedUrl === r.url ? "secondary" : "default"}
                    onClick={() => {
                      onSelect(r.url);
                      setOpen(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {selectedUrl === r.url ? "Seleccionado" : "Usar este logo"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SelectedLogoCard({ url, onClear }: { url: string; onClear: () => void }) {
  return (
    <div className="rounded-md border border-input p-3 space-y-2">
      <LogoPreview url={url} alt="Logo seleccionado" maxHeightClass="max-h-28" />
      <Button type="button" size="sm" variant="outline" onClick={onClear}>
        Cambiar logo
      </Button>
    </div>
  );
}
