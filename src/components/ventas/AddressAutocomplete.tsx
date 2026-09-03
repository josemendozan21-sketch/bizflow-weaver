import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin } from "lucide-react";

export type ResolvedAddress = {
  address: string;
  formattedAddress: string;
  city: string;
  department: string;
};

type Suggestion = { placeId: string; primary: string; secondary: string; text: string };

type Props = {
  label?: string;
  name: string;
  required?: boolean;
  /** Valor controlado opcional (formularios no controlados pueden omitirlo). */
  value?: string;
  onValueChange?: (v: string) => void;
  /** Se dispara al elegir una sugerencia con la ciudad/departamento resueltos. */
  onResolved?: (r: ResolvedAddress) => void;
  className?: string;
  placeholder?: string;
  /** Si se define, se renderiza el campo de complemento (oficina, apto, bloque...). */
  complementName?: string;
  complementValue?: string;
  onComplementChange?: (v: string) => void;
  complementLabel?: string;
};

/**
 * Campo de dirección con autopredicción de Google Places.
 * Si la función de backend no tiene llave configurada, el campo
 * sigue funcionando como un input de texto normal.
 */
export default function AddressAutocomplete({
  label = "Dirección de envío",
  name,
  required,
  value,
  onValueChange,
  onResolved,
  className,
  placeholder = "Ej: Calle 92 # 15-40, Bogotá",
  complementName,
  complementValue,
  onComplementChange,
  complementLabel = "Complemento (oficina, apto, bloque, interior, local)",
}: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState("");
  const text = controlled ? (value as string) : inner;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const sessionToken = useRef<string>(crypto.randomUUID());
  const skipNext = useRef(false);

  const setText = (v: string) => {
    if (controlled) onValueChange?.(v);
    else setInner(v);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (disabled) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = text.trim();
    if (q.length < 4) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
        body: { action: "autocomplete", input: q, sessionToken: sessionToken.current },
      });
      if (cancelled) return;
      setLoading(false);
      if (error) return;
      if ((data as any)?.disabled) {
        setDisabled(true);
        return;
      }
      setSuggestions(((data as any)?.suggestions ?? []) as Suggestion[]);
      setOpen(true);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, disabled]);

  const choose = async (s: Suggestion) => {
    skipNext.current = true;
    setText(s.text || `${s.primary} ${s.secondary}`.trim());
    setOpen(false);
    setSuggestions([]);
    const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
      body: { action: "details", placeId: s.placeId, sessionToken: sessionToken.current },
    });
    sessionToken.current = crypto.randomUUID();
    if (error || !data) return;
    const r = data as ResolvedAddress;
    if (r.address) {
      skipNext.current = true;
      setText(r.address);
    }
    onResolved?.(r);
  };

  const complementControlled = complementValue !== undefined;
  const [innerComplement, setInnerComplement] = useState("");
  const complementText = complementControlled ? (complementValue as string) : innerComplement;

  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
    <div className="space-y-1.5 relative" ref={boxRef}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-md border bg-popover shadow-md max-h-64 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              className="w-full text-left px-2 py-1.5 hover:bg-accent text-sm flex items-start gap-2"
              onClick={() => choose(s)}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="font-medium block truncate">{s.primary}</span>
                <span className="block text-[11px] text-muted-foreground truncate">{s.secondary}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
      {complementName && (
        <div className="space-y-1.5 pt-2">
          <Label htmlFor={complementName}>{complementLabel}</Label>
          <Input
            id={complementName}
            name={complementName}
            autoComplete="off"
            placeholder="Ej: OFC 402, Torre B Apto 501, Local 12"
            value={complementText}
            onChange={(e) => {
              if (complementControlled) onComplementChange?.(e.target.value);
              else setInnerComplement(e.target.value);
            }}
          />
        </div>
      )}
    </div>
  );
}
