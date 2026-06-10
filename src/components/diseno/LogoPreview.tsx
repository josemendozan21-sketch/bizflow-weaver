import { FileText, ExternalLink } from "lucide-react";

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "archivo";
    return decodeURIComponent(last);
  } catch {
    return url.split("/").pop() || "archivo";
  }
}

function isPdf(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

interface Props {
  url: string | null | undefined;
  alt?: string;
  maxHeightClass?: string;
}

/**
 * Renders a logo file. If the URL is a PDF (or any non-image), shows a labelled
 * card with the original filename plus a link to open it, instead of a broken
 * <img> tag.
 */
export function LogoPreview({ url, alt = "Logo", maxHeightClass = "max-h-20" }: Props) {
  if (!url) {
    return <div className="text-xs text-muted-foreground">Sin archivo</div>;
  }

  if (isPdf(url)) {
    const name = fileNameFromUrl(url);
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-1 text-center hover:opacity-80"
        title={name}
      >
        <FileText className="h-8 w-8 text-destructive" />
        <p className="text-xs text-muted-foreground max-w-[140px] truncate">{name}</p>
        <span className="text-[10px] text-primary flex items-center gap-0.5">
          Abrir PDF <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </a>
    );
  }

  return <img src={url} alt={alt} className={`${maxHeightClass} object-contain`} />;
}