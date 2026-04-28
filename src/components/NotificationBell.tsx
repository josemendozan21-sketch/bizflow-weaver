import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const typeIcons: Record<string, string> = {
  nuevo_pedido: "📦",
  bajo_inventario: "⚠️",
  diseno_logo: "🎨",
  confirmacion: "✅",
  produccion: "🏭",
  pedido_listo: "✨",
  pedido_despachado: "🚚",
  facturado: "🧾",
  avance_etapa: "➡️",
};

const typeColors: Record<string, { bg: string; border: string; dot: string }> = {
  bajo_inventario: { bg: "bg-destructive/10", border: "border-l-4 border-l-destructive", dot: "bg-destructive" },
  nuevo_pedido: { bg: "bg-yellow-500/10", border: "border-l-4 border-l-yellow-500", dot: "bg-yellow-500" },
  confirmacion: { bg: "bg-green-500/10", border: "border-l-4 border-l-green-500", dot: "bg-green-500" },
  diseno_logo: { bg: "bg-blue-500/10", border: "border-l-4 border-l-blue-500", dot: "bg-blue-500" },
  produccion: { bg: "bg-orange-500/10", border: "border-l-4 border-l-orange-500", dot: "bg-orange-500" },
  pedido_listo: { bg: "bg-emerald-500/10", border: "border-l-4 border-l-emerald-500", dot: "bg-emerald-500" },
  pedido_despachado: { bg: "bg-cyan-500/10", border: "border-l-4 border-l-cyan-500", dot: "bg-cyan-500" },
  facturado: { bg: "bg-violet-500/10", border: "border-l-4 border-l-violet-500", dot: "bg-violet-500" },
  avance_etapa: { bg: "bg-sky-500/10", border: "border-l-4 border-l-sky-500", dot: "bg-sky-500" },
};

const defaultColor = { bg: "", border: "border-l-4 border-l-muted", dot: "bg-muted-foreground" };

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const colors = typeColors[n.type] || defaultColor;
                return (
                  <button
                    key={n.id}
                    className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${colors.border} ${
                      !n.read ? colors.bg : ""
                    }`}
                    onClick={() => {
                      if (!n.read) markAsRead.mutate(n.id);
                    }}
                  >
                    <div className="flex gap-2">
                      <span className="text-base mt-0.5">{typeIcons[n.type] || "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
