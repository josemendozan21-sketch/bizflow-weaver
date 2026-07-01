import { useEffect, useState } from "react";
import { Wifi, WifiOff, CloudUpload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFeriaOfflineStore } from "@/stores/feriaOfflineStore";

export function OfflineIndicator() {
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const pending = useFeriaOfflineStore((s) =>
    s.pendingSales.filter((x) => x.status !== "synced").length
  );

  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  if (online && pending === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300 bg-emerald-50">
        <Wifi className="h-3 w-3" /> En línea
      </Badge>
    );
  }
  if (!online) {
    return (
      <Badge variant="outline" className="gap-1 text-amber-800 border-amber-300 bg-amber-50">
        <WifiOff className="h-3 w-3" /> Sin conexión{pending > 0 ? ` · ${pending} pendientes` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-blue-700 border-blue-300 bg-blue-50">
      <CloudUpload className="h-3 w-3 animate-pulse" /> Sincronizando · {pending} pendientes
    </Badge>
  );
}