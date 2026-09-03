import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

/**
 * TabsList con scroll horizontal contenido + flechas de navegación.
 * Las flechas sólo aparecen cuando el contenido se desborda, así los menús
 * largos nunca se cortan sin señal visual (especialmente en móvil).
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    /** Clases para el contenedor exterior (wrapper con flechas) */
    containerClassName?: string;
  }
>(({ className, containerClassName, ...props }, ref) => {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);

  const update = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(max > 4 && el.scrollLeft < max - 4);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className={cn("relative w-full min-w-0", containerClassName)}>
      <div
        ref={scrollRef}
        className="w-full min-w-0 overflow-x-auto scrollbar-none"
      >
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            "inline-flex h-10 w-max min-w-full items-center justify-start rounded-md bg-muted p-1 text-muted-foreground",
            className,
          )}
          {...props}
        />
      </div>

      {canLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-md bg-gradient-to-r from-background to-transparent" />
          <button
            type="button"
            aria-label="Desplazar pestañas a la izquierda"
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background/95 p-1 shadow-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}

      {canRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-md bg-gradient-to-l from-background to-transparent" />
          <button
            type="button"
            aria-label="Desplazar pestañas a la derecha"
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background/95 p-1 shadow-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
