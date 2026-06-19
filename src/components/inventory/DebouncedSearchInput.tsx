import { memo, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
}

/**
 * Search input with its own internal state. Decouples typing from parent
 * re-renders (which were happening on every realtime tick from useInventory
 * and causing the input to lose focus on each keystroke).
 */
const DebouncedSearchInput = memo(function DebouncedSearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className,
  delay = 150,
}: DebouncedSearchInputProps) {
  const [local, setLocal] = useState(value);
  const lastEmitted = useRef(value);

  // Sync down only when the external value changes from an outside source
  // (e.g. cleared programmatically). Avoid clobbering while the user types.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setLocal(value);
      lastEmitted.current = value;
    }
  }, [value]);

  // Debounce upward propagation.
  useEffect(() => {
    if (local === lastEmitted.current) return;
    const t = window.setTimeout(() => {
      lastEmitted.current = local;
      onChange(local);
    }, delay);
    return () => window.clearTimeout(t);
  }, [local, delay, onChange]);

  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className={className ?? "pl-8 h-9"}
      />
    </div>
  );
});

export default DebouncedSearchInput;