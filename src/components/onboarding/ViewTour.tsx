import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  /** CSS selector of the element to highlight (must exist in the DOM) */
  selector: string;
  title: string;
  body: string;
}

interface ViewTourProps {
  /** Unique key, persisted in localStorage so it shows only once */
  tourKey: string;
  steps: TourStep[];
}

const STORAGE_PREFIX = "viewtour:v1:";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Lightweight guided tour for a view: highlights elements one by one with an
 * explanatory tooltip. Shows automatically the first time (per browser) and
 * can be relaunched via the floating help button.
 */
export function ViewTour({ tourKey, steps }: ViewTourProps) {
  const storageKey = STORAGE_PREFIX + tourKey;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Auto-open on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [storageKey]);

  const close = useCallback(
    (markSeen: boolean) => {
      setOpen(false);
      setIndex(0);
      if (markSeen) {
        try {
          localStorage.setItem(storageKey, "1");
        } catch {
          /* ignore */
        }
      }
    },
    [storageKey],
  );

  const current = steps[index];

  // Measure target on step change / resize / scroll
  useLayoutEffect(() => {
    if (!open || !current) return;
    const update = () => setRect(measure(current.selector));
    update();
    // Give dynamic content a moment to settle
    const t = setTimeout(update, 150);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, current]);

  // Scroll the target into view when the step changes
  useEffect(() => {
    if (!open || !current) return;
    document
      .querySelector(current.selector)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, current]);

  const isLast = index === steps.length - 1;

  // Tooltip placement: below the target if there's room, otherwise above
  const PAD = 8;
  let tooltipStyle: React.CSSProperties = {};
  if (rect) {
    const belowTop = rect.top + rect.height + PAD;
    const spaceBelow = window.innerHeight - belowTop;
    const left = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - 340 - 12),
    );
    tooltipStyle =
      spaceBelow > 200
        ? { top: belowTop, left }
        : { bottom: window.innerHeight - rect.top + PAD, left };
  }

  return (
    <>
      {/* Relaunch button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        aria-label="Ver guía de esta pantalla"
      >
        <HelpCircle className="h-4 w-4" /> Guía
      </Button>

      {open && current && (
        <div
          className="fixed inset-0 z-[90]"
          role="dialog"
          aria-modal="true"
          aria-label="Guía de la pantalla"
        >
          {/* Backdrop with a "hole" over the target */}
          {rect ? (
            <div
              className="absolute rounded-md ring-[9999px] ring-black/60 border-2 border-primary transition-all duration-200"
              style={{
                top: rect.top - PAD,
                left: rect.left - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-black/60" />
          )}

          {/* Tooltip card */}
          <div
            className={cn(
              "absolute w-[min(340px,calc(100vw-24px))] rounded-lg border bg-card p-4 shadow-xl",
              !rect && "left-1/2 top-1/3 -translate-x-1/2",
            )}
            style={tooltipStyle}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-card-foreground">
                {current.title}
              </h3>
              <button
                onClick={() => close(true)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Cerrar guía"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {current.body}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {index + 1} de {steps.length}
              </span>
              <div className="flex gap-1.5">
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setIndex(index - 1)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Atrás
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" onClick={() => close(true)}>
                    Entendido
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => setIndex(index + 1)}
                  >
                    Siguiente <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <button
              onClick={() => close(true)}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Omitir guía
            </button>
          </div>
        </div>
      )}
    </>
  );
}
