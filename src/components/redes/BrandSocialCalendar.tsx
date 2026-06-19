import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Star, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSocialPosts, type SocialBrand, type SocialPost } from "@/hooks/useSocialPosts";
import { SocialPostDialog } from "./SocialPostDialog";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  programado: "bg-primary/15 text-primary",
  publicado: "bg-green-500/15 text-green-700 dark:text-green-400",
};

interface Props {
  brand: SocialBrand;
}

interface SocialEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
}

export function BrandSocialCalendar({ brand }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);

  const { posts, loading } = useSocialPosts(brand);
  const [events, setEvents] = useState<SocialEvent[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("social_events" as any)
        .select("id,title,start_date,end_date,location")
        .eq("brand", brand);
      if (active) setEvents(((data ?? []) as any) as SocialEvent[]);
    };
    load();
    const ch = supabase
      .channel(`social_events_${brand}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_events", filter: `brand=eq.${brand}` },
        () => load(),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [brand]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, SocialEvent[]> = {};
    for (const ev of events) {
      const start = ev.start_date;
      const end = ev.end_date ?? ev.start_date;
      const s = new Date(start + "T00:00:00");
      const e = new Date(end + "T00:00:00");
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        (map[key] ??= []).push(ev);
      }
    }
    return map;
  }, [events]);

  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    for (const p of posts) {
      (map[p.scheduled_date] ??= []).push(p);
    }
    return map;
  }, [posts]);

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };

  const openNew = (date?: string) => {
    setEditingPost(null);
    setInitialDate(date);
    setDialogOpen(true);
  };

  const openEdit = (p: SocialPost) => {
    setEditingPost(p);
    setInitialDate(undefined);
    setDialogOpen(true);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="text-lg font-semibold w-44 text-center">{MONTHS[month]} {year}</h3>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Hoy</Button>
        </div>
        <Button onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" /> Nueva publicación</Button>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-xs font-medium text-center text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="min-h-[100px] bg-muted/20 rounded" />;
            const dayPosts = postsByDate[cell.date] ?? [];
            const isToday = cell.date === todayStr;
            return (
              <div
                key={i}
                className={`min-h-[100px] rounded border p-1 flex flex-col gap-1 hover:bg-accent/30 transition cursor-pointer ${isToday ? "border-primary border-2" : "border-border"}`}
                onClick={() => openNew(cell.date)}
              >
                <div className="text-xs font-medium text-muted-foreground">{cell.day}</div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {(eventsByDate[cell.date] ?? []).map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[10px] leading-tight rounded px-1 py-0.5 truncate flex items-center gap-1 bg-purple-500/15 text-purple-700 dark:text-purple-300"
                      title={`${ev.title}${ev.location ? " — " + ev.location : ""}`}
                    >
                      <CalendarRange className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {dayPosts.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      className={`text-[10px] leading-tight text-left rounded px-1 py-0.5 truncate flex items-center gap-1 ${p.is_special_date ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : STATUS_COLORS[p.status]}`}
                      title={p.title}
                    >
                      {p.is_special_date && <Star className="h-2.5 w-2.5 shrink-0 fill-current" />}
                      <span className="truncate">{p.title}</span>
                    </button>
                  ))}
                  {dayPosts.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">+{dayPosts.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Cargando publicaciones...</p>}

      <SocialPostDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        brand={brand}
        initialDate={initialDate}
        post={editingPost}
      />
    </div>
  );
}
