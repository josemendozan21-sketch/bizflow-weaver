import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileQuestion, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "archivo";
    return decodeURIComponent(last);
  } catch {
    return url.split("/").pop() || "archivo";
  }
}

function extensionFromUrl(url: string): string {
  const clean = url.toLowerCase().split("?")[0].split("#")[0];
  const match = clean.match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

interface Props {
  url: string | null | undefined;
  alt?: string;
  maxHeightClass?: string;
  className?: string;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif"]);
const NON_PREVIEW_EXTENSIONS = new Set(["ai", "eps", "psd", "cdr"]);

function PdfThumbnail({ url, name, alt }: { url: string; name: string; alt: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | undefined;

    const render = async () => {
      setState("loading");
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const task = pdfjs.getDocument({ url });
        loadingTask = task;
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const initialViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, 520 / initialViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas unavailable");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    };

    void render();
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [url, visible]);

  return (
    <div ref={hostRef} className="flex min-h-24 w-full flex-col items-center justify-center gap-2">
      {state !== "error" && (
        <div className="relative flex min-h-20 w-full items-center justify-center overflow-hidden rounded border bg-background">
          {state !== "ready" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${alt}, primera página del PDF`}
            className={`${state === "ready" ? "block" : "hidden"} max-h-40 max-w-full object-contain`}
          />
        </div>
      )}
      {state === "error" && <FileText className="h-9 w-9 text-destructive" />}
      <p className="max-w-full truncate text-xs text-muted-foreground" title={name}>{name}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-xs font-medium text-primary hover:underline"
      >
        Abrir PDF <ExternalLink className="ml-1 h-3 w-3" />
      </a>
    </div>
  );
}

export function LogoPreview({ url, alt = "Logo", maxHeightClass = "max-h-20", className = "" }: Props) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => setImageError(false), [url]);

  if (!url) {
    return <div className="text-xs text-muted-foreground">Sin archivo</div>;
  }

  const extension = extensionFromUrl(url);
  const name = fileNameFromUrl(url);

  if (extension === "pdf") {
    return <PdfThumbnail url={url} name={name} alt={alt} />;
  }

  if (NON_PREVIEW_EXTENSIONS.has(extension) || imageError) {
    return (
      <div className="flex min-h-24 w-full flex-col items-center justify-center gap-1 text-center">
        <FileQuestion className="h-9 w-9 text-muted-foreground" />
        <p className="max-w-full truncate text-xs text-muted-foreground" title={name}>{name}</p>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Abrir archivo <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>
    );
  }

  const canAttemptImage = IMAGE_EXTENSIONS.has(extension) || url.startsWith("data:image/") || url.startsWith("blob:");
  if (!canAttemptImage) {
    return (
      <div className="flex min-h-24 w-full flex-col items-center justify-center gap-1 text-center">
        <FileQuestion className="h-9 w-9 text-muted-foreground" />
        <p className="max-w-full truncate text-xs text-muted-foreground" title={name}>{name}</p>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">Abrir archivo</a>
        </Button>
      </div>
    );
  }

  return (
    <div className={`logo-preview-surface flex min-h-20 w-full items-center justify-center overflow-hidden rounded p-2 ${className}`}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setImageError(true)}
        className={`${maxHeightClass} max-w-full object-contain drop-shadow-sm`}
      />
    </div>
  );
}