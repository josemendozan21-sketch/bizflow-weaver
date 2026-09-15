import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";

type Item = { label: string; count: number };

type Props = {
  references: Item[];
  subReferences: Item[];
  selectedReference: string | null;
  selectedSubReference: string | null;
  onSelectReference: (value: string | null) => void;
  onSelectSubReference: (value: string | null) => void;
};

export function ReferenceFilterChips({
  references,
  subReferences,
  selectedReference,
  selectedSubReference,
  onSelectReference,
  onSelectSubReference,
}: Props) {
  if (references.length <= 1) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedReference === null ? "default" : "outline"}
          onClick={() => {
            onSelectReference(null);
            onSelectSubReference(null);
          }}
          className="gap-1"
        >
          <Layers className="h-3.5 w-3.5" /> Todas las referencias
        </Button>
        {references.map((r) => (
          <Button
            key={r.label}
            size="sm"
            variant={selectedReference === r.label ? "default" : "outline"}
            onClick={() => {
              onSelectReference(selectedReference === r.label ? null : r.label);
              onSelectSubReference(null);
            }}
            className="gap-1"
          >
            {r.label}
            <span className="text-xs opacity-70">({r.count})</span>
          </Button>
        ))}
      </div>
      {selectedReference && subReferences.length > 1 && (
        <div className="flex flex-wrap gap-2 pl-1">
          <Button
            size="sm"
            variant={selectedSubReference === null ? "secondary" : "ghost"}
            onClick={() => onSelectSubReference(null)}
            className="h-7 text-xs"
          >
            Todas
          </Button>
          {subReferences.map((s) => (
            <Button
              key={s.label}
              size="sm"
              variant={selectedSubReference === s.label ? "secondary" : "ghost"}
              onClick={() => onSelectSubReference(selectedSubReference === s.label ? null : s.label)}
              className="h-7 text-xs gap-1"
            >
              {s.label}
              <span className="opacity-70">({s.count})</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function countBy<T>(items: T[], key: (item: T) => string | null | undefined, fallback: string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const raw = (key(item) ?? "").trim();
    const label = raw || fallback;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      if (a[0] === fallback) return 1;
      if (b[0] === fallback) return -1;
      return a[0].localeCompare(b[0]);
    })
    .map(([label, count]) => ({ label, count }));
}

export const NO_REFERENCE = "Sin referencia";
export const NO_SUB_REFERENCE = "Sin subreferencia";
