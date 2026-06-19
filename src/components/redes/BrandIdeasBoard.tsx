import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Lightbulb, CalendarRange, Trash2, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Idea {
  id: string;
  brand: string;
  title: string;
  description: string | null;
  status: string;
  created_by_name: string | null;
  created_at: string;
}
interface Event {
  id: string;
  brand: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  created_by_name: string | null;
}

const statusMeta: Record<string, { label: string; cls: string }> = {
  idea: { label: "Idea", cls: "bg-amber-500/10 text-amber-700 border-amber-300" },
  en_progreso: { label: "En progreso", cls: "bg-blue-500/10 text-blue-700 border-blue-300" },
  publicada: { label: "Publicada", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  descartada: { label: "Descartada", cls: "bg-muted text-muted-foreground border-border" },
};

export function BrandIdeasBoard({ brand }: { brand: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const showEvents = brand !== "bionovations";

  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", status: "idea" });

  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
  });

  const load = async () => {
    const ideasReq = supabase
      .from("social_ideas" as any)
      .select("*")
      .eq("brand", brand)
      .order("created_at", { ascending: false });
    if (showEvents) {
      const [{ data: i }, { data: e }] = await Promise.all([
        ideasReq,
        supabase
          .from("social_events" as any)
          .select("*")
          .eq("brand", brand)
          .order("start_date", { ascending: true }),
      ]);
      setIdeas((i ?? []) as any);
      setEvents((e ?? []) as any);
    } else {
      const { data: i } = await ideasReq;
      setIdeas((i ?? []) as any);
      setEvents([]);
    }
  };

  useEffect(() => {
    load();
  }, [brand]);

  const createIdea = async () => {
    if (!ideaForm.title.trim()) return;
    const { error } = await supabase.from("social_ideas" as any).insert({
      brand,
      title: ideaForm.title.trim(),
      description: ideaForm.description.trim() || null,
      status: ideaForm.status,
      created_by: user?.id ?? null,
      created_by_name: user?.email ?? null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setIdeaForm({ title: "", description: "", status: "idea" });
    setIdeaOpen(false);
    load();
  };

  const updateIdeaStatus = async (id: string, status: string) => {
    await supabase.from("social_ideas" as any).update({ status }).eq("id", id);
    load();
  };

  const deleteIdea = async (id: string) => {
    await supabase.from("social_ideas" as any).delete().eq("id", id);
    load();
  };

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.start_date) return;
    const { error } = await supabase.from("social_events" as any).insert({
      brand,
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || null,
      location: eventForm.location.trim() || null,
      start_date: eventForm.start_date,
      end_date: eventForm.end_date || null,
      created_by: user?.id ?? null,
      created_by_name: user?.email ?? null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setEventForm({ title: "", description: "", location: "", start_date: "", end_date: "" });
    setEventOpen(false);
    load();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("social_events" as any).delete().eq("id", id);
    load();
  };

  const columns: Array<{ key: string; label: string }> = [
    { key: "idea", label: "Ideas" },
    { key: "en_progreso", label: "En progreso" },
    { key: "publicada", label: "Publicadas" },
    { key: "descartada", label: "Descartadas" },
  ];

  return (
    <div className="space-y-6">
      {/* EVENTS */}
      {showEvents && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Eventos y ferias
          </CardTitle>
          <Dialog open={eventOpen} onOpenChange={setEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="Feria de Cali"
                  />
                </div>
                <div>
                  <Label>Lugar</Label>
                  <Input
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="Cali, Valle"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Inicio *</Label>
                    <Input
                      type="date"
                      value={eventForm.start_date}
                      onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fin</Label>
                    <Input
                      type="date"
                      value={eventForm.end_date}
                      onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEventOpen(false)}>Cancelar</Button>
                <Button onClick={createEvent}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos. Agrega ferias, lanzamientos o fechas clave.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev) => {
                const start = parseISO(ev.start_date);
                const end = ev.end_date ? parseISO(ev.end_date) : null;
                return (
                  <div key={ev.id} className="rounded-lg border p-3 bg-card relative group">
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <p className="font-semibold text-sm pr-6">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(start, "d MMM yyyy", { locale: es })}
                      {end && ` → ${format(end, "d MMM yyyy", { locale: es })}`}
                    </p>
                    {ev.location && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-xs mt-2 whitespace-pre-wrap">{ev.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* IDEAS BOARD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Tablero de ideas
          </CardTitle>
          <Dialog open={ideaOpen} onOpenChange={setIdeaOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Idea
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva idea</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={ideaForm.title}
                    onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                    placeholder="Reel mostrando termo en uso..."
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={ideaForm.description}
                    onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={ideaForm.status}
                    onValueChange={(v) => setIdeaForm({ ...ideaForm, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIdeaOpen(false)}>Cancelar</Button>
                <Button onClick={createIdea}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {columns.map((col) => {
              const items = ideas.filter((i) => i.status === col.key);
              return (
                <div key={col.key} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {col.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {items.map((idea) => (
                      <div key={idea.id} className="rounded-lg border bg-card p-3 group relative">
                        <button
                          onClick={() => deleteIdea(idea.id)}
                          className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <p className="font-medium text-sm pr-5">{idea.title}</p>
                        {idea.description && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                            {idea.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {idea.created_by_name ?? "—"}
                          </span>
                          <Select
                            value={idea.status}
                            onValueChange={(v) => updateIdeaStatus(idea.id, v)}
                          >
                            <SelectTrigger className={`h-6 text-[10px] px-2 ${statusMeta[idea.status]?.cls ?? ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map((c) => (
                                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                        Vacío
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}