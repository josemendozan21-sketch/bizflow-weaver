import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  X,
  Pencil,
  Users,
  DoorClosed,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePosCalendarEvents,
  useUpsertPosCalendarEvent,
  useDeletePosCalendarEvent,
  type PosCalendarEvent,
  type PosCalendarEventType,
} from "@/hooks/usePuntosVenta";
import { cn } from "@/lib/utils";

const TYPE_META: Record<
  PosCalendarEventType,
  { label: string; badge: string; dot: string; icon: typeof Clock }
> = {
  turno: {
    label: "Turno",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    icon: Clock,
  },
  cerrado: {
    label: "Cerrado",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
    icon: DoorClosed,
  },
  refuerzo: {
    label: "Necesita personal",
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    dot: "bg-amber-500",
    icon: Users,
  },
  actividad: {
    label: "Actividad",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
    icon: Sparkles,
  },
};

function toIsoDate(d: Date) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(anchor: Date) {
  const first = startOfMonth(anchor);
  // Start week on Monday
  const weekday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - weekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type DialogState = {
  open: boolean;
  event?: PosCalendarEvent | null;
  defaultDate?: string;
};

export function PuntoCalendario({
  locationId,
  canEdit,
}: {
  locationId: string;
  canEdit: boolean;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const { data: events = [], isLoading } = usePosCalendarEvents(locationId);
  const upsert = useUpsertPosCalendarEvent(locationId);
  const del = useDeletePosCalendarEvent(locationId);

  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const month = anchor.getMonth();
  const year = anchor.getFullYear();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PosCalendarEvent[]>();
    for (const ev of events) {
      const arr = map.get(ev.event_date) ?? [];
      arr.push(ev);
      map.set(ev.event_date, arr);
    }
    return map;
  }, [events]);

  const monthEvents = useMemo(() => {
    const monthStart = toIsoDate(new Date(year, month, 1));
    const monthEnd = toIsoDate(new Date(year, month + 1, 0));
    return events.filter((e) => e.event_date >= monthStart && e.event_date <= monthEnd);
  }, [events, year, month]);

  const todayIso = toIsoDate(new Date());

  const openCreate = (date?: string) => {
    if (!canEdit) return;
    setDialog({ open: true, event: null, defaultDate: date ?? toIsoDate(new Date()) });
  };
  const openEdit = (ev: PosCalendarEvent) => {
    setDialog({ open: true, event: ev });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" /> Calendario del punto
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAnchor(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium w-40 text-center capitalize">
              {MONTH_NAMES[month]} {year}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAnchor(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 ml-1" onClick={() => setAnchor(new Date())}>
              Hoy
            </Button>
            {canEdit && (
              <Button size="sm" className="h-8 ml-1" onClick={() => openCreate()}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mes">
            <TabsList>
              <TabsTrigger value="mes">Vista mensual</TabsTrigger>
              <TabsTrigger value="lista">Lista del mes</TabsTrigger>
            </TabsList>

            <TabsContent value="mes" className="mt-3">
              <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden text-xs">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="bg-muted px-2 py-1 font-medium text-muted-foreground text-center">
                    {w}
                  </div>
                ))}
                {days.map((d) => {
                  const iso = toIsoDate(d);
                  const inMonth = d.getMonth() === month;
                  const dayEvents = eventsByDate.get(iso) ?? [];
                  const isToday = iso === todayIso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => openCreate(iso)}
                      className={cn(
                        "bg-background min-h-[88px] p-1.5 text-left flex flex-col gap-1 transition-colors",
                        !inMonth && "bg-muted/30 text-muted-foreground",
                        canEdit && "hover:bg-accent/40 cursor-pointer",
                        !canEdit && "cursor-default",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            isToday && "bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center",
                          )}
                        >
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const meta = TYPE_META[ev.event_type];
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(ev);
                              }}
                              className={cn(
                                "truncate text-[10px] px-1 py-0.5 rounded border leading-tight",
                                meta.badge,
                              )}
                              title={`${meta.label} · ${ev.title}`}
                            >
                              {ev.start_time ? ev.start_time.slice(0, 5) + " " : ""}
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{dayEvents.length - 3} más
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
                {(Object.keys(TYPE_META) as PosCalendarEventType[]).map((k) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className={cn("inline-block w-2.5 h-2.5 rounded-full", TYPE_META[k].dot)} />
                    {TYPE_META[k].label}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="lista" className="mt-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : monthEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay eventos en {MONTH_NAMES[month]}.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {monthEvents.map((ev) => {
                    const meta = TYPE_META[ev.event_type];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 border rounded-md p-2.5 bg-card"
                      >
                        <div className="text-center w-12 shrink-0">
                          <div className="text-[10px] uppercase text-muted-foreground">
                            {WEEKDAYS[(new Date(ev.event_date + "T00:00:00").getDay() + 6) % 7]}
                          </div>
                          <div className="text-lg font-semibold leading-none">
                            {ev.event_date.slice(8, 10)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn("text-[10px]", meta.badge)}>
                              <Icon className="h-3 w-3 mr-1" />
                              {meta.label}
                            </Badge>
                            <span className="font-medium text-sm">{ev.title}</span>
                            {(ev.start_time || ev.end_time) && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {ev.start_time?.slice(0, 5) ?? "—"}
                                {" - "}
                                {ev.end_time?.slice(0, 5) ?? "—"}
                              </span>
                            )}
                          </div>
                          {ev.assigned_to && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Asignado a: {ev.assigned_to}
                            </div>
                          )}
                          {ev.notes && (
                            <div className="text-xs text-muted-foreground mt-0.5">{ev.notes}</div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ev)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => {
                                if (confirm("¿Eliminar este evento?")) {
                                  del.mutate(ev.id, {
                                    onSuccess: () => toast.success("Evento eliminado"),
                                    onError: (e: any) => toast.error(e.message),
                                  });
                                }
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EventDialog
        state={dialog}
        onClose={() => setDialog({ open: false })}
        canEdit={canEdit}
        onSave={async (payload) => {
          try {
            await upsert.mutateAsync(payload);
            toast.success(payload.id ? "Evento actualizado" : "Evento creado");
            setDialog({ open: false });
          } catch (e: any) {
            toast.error(e.message ?? "Error al guardar");
          }
        }}
        onDelete={async (id) => {
          try {
            await del.mutateAsync(id);
            toast.success("Evento eliminado");
            setDialog({ open: false });
          } catch (e: any) {
            toast.error(e.message ?? "Error al eliminar");
          }
        }}
      />
    </div>
  );
}

function EventDialog({
  state,
  onClose,
  onSave,
  onDelete,
  canEdit,
}: {
  state: DialogState;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    event_type: PosCalendarEventType;
    title: string;
    notes?: string | null;
    assigned_to?: string | null;
  }) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}) {
  const editing = state.event ?? null;
  const initialDate = editing?.event_date ?? state.defaultDate ?? toIsoDate(new Date());

  const [eventType, setEventType] = useState<PosCalendarEventType>(editing?.event_type ?? "turno");
  const [eventDate, setEventDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(editing?.start_time?.slice(0, 5) ?? "09:00");
  const [endTime, setEndTime] = useState(editing?.end_time?.slice(0, 5) ?? "18:00");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [assignedTo, setAssignedTo] = useState(editing?.assigned_to ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  // Reset when dialog opens for a new context
  const key = `${state.open}-${editing?.id ?? "new"}-${initialDate}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemoReset(key, () => {
    setEventType(editing?.event_type ?? "turno");
    setEventDate(initialDate);
    setStartTime(editing?.start_time?.slice(0, 5) ?? "09:00");
    setEndTime(editing?.end_time?.slice(0, 5) ?? "18:00");
    setTitle(editing?.title ?? "");
    setAssignedTo(editing?.assigned_to ?? "");
    setNotes(editing?.notes ?? "");
  });

  const hasTime = eventType === "turno" || eventType === "actividad";

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Pon un título al evento");
      return;
    }
    onSave({
      id: editing?.id,
      event_date: eventDate,
      start_time: hasTime ? startTime : null,
      end_time: hasTime ? endTime : null,
      event_type: eventType,
      title: title.trim(),
      notes: notes.trim() || null,
      assigned_to: assignedTo.trim() || null,
    });
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar evento" : "Nuevo evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as PosCalendarEventType)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="turno">Turno de trabajo</SelectItem>
                <SelectItem value="cerrado">Día cerrado</SelectItem>
                <SelectItem value="refuerzo">Necesita más personal</SelectItem>
                <SelectItem value="actividad">Actividad / evento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} disabled={!canEdit} />
          </div>
          {hasTime && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Inicio</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!canEdit} />
              </div>
            </div>
          )}
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                eventType === "turno"
                  ? "Ej: Turno mañana"
                  : eventType === "cerrado"
                  ? "Ej: Festivo / inventario"
                  : eventType === "refuerzo"
                  ? "Ej: Refuerzo fin de mes"
                  : "Ej: Capacitación de producto"
              }
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Asignado a (opcional)</Label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Nombre del asesor o equipo"
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={!canEdit} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {editing && canEdit && (
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("¿Eliminar este evento?")) onDelete(editing.id);
              }}
            >
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {canEdit && (
            <Button onClick={handleSubmit}>{editing ? "Guardar" : "Crear"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper: run a callback when a string key changes (like a useEffect on key).
import { useEffect, useRef } from "react";
function useMemoReset(key: string, cb: () => void) {
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      cb();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}