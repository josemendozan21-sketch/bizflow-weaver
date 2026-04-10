import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useDeliveryStore, type DeliveryEntry } from "@/stores/deliveryStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight, MapPin, Package, AlertTriangle, CheckCircle, Truck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventProductRow = Database["public"]["Tables"]["event_products"]["Row"];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  feria: "Feria",
  carrera: "Carrera",
  activacion: "Activación",
};

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  feria: "bg-blue-100 text-blue-800",
  carrera: "bg-green-100 text-green-800",
  activacion: "bg-purple-100 text-purple-800",
};

interface EventWithProducts extends EventRow {
  event_products: EventProductRow[];
}

const Eventos = () => {
  const { user } = useAuth();
  const { materialConfigs } = useInventoryStore();
  const deliveryEntries = useDeliveryStore((s) => s.entries);
  const updateDeliveryStatus = useDeliveryStore((s) => s.updateStatus);
  const [events, setEvents] = useState<EventWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventWithProducts | null>(null);
  const [selectedDayDeliveries, setSelectedDayDeliveries] = useState<DeliveryEntry[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deliveryDetailOpen, setDeliveryDetailOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState<Date>();
  const [formCity, setFormCity] = useState("");
  const [formType, setFormType] = useState<EventType>("feria");
  const [formNotes, setFormNotes] = useState("");
  const [formProducts, setFormProducts] = useState<{ product_name: string; brand: string; quantity_needed: number }[]>([]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*, event_products(*)")
      .order("event_date", { ascending: true });
    if (error) {
      toast.error("Error al cargar eventos");
    } else {
      setEvents((data as EventWithProducts[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDate(undefined);
    setFormCity("");
    setFormType("feria");
    setFormNotes("");
    setFormProducts([]);
  };

  const handleCreate = async () => {
    if (!formName || !formDate || !formCity) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        name: formName,
        event_date: format(formDate, "yyyy-MM-dd"),
        city: formCity,
        event_type: formType,
        notes: formNotes || null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (eventError) {
      toast.error("Error al crear evento");
      return;
    }

    if (formProducts.length > 0) {
      const { error: prodError } = await supabase.from("event_products").insert(
        formProducts.map((p) => ({
          event_id: eventData.id,
          product_name: p.product_name,
          brand: p.brand,
          quantity_needed: p.quantity_needed,
        }))
      );
      if (prodError) toast.error("Error al guardar productos");
    }

    toast.success("Evento creado exitosamente");
    resetForm();
    setDialogOpen(false);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar evento");
    } else {
      toast.success("Evento eliminado");
      setDetailOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    }
  };

  const addProductRow = () => {
    setFormProducts([...formProducts, { product_name: "", brand: "Magical", quantity_needed: 0 }]);
  };

  const updateProductRow = (idx: number, field: string, value: string | number) => {
    setFormProducts(formProducts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const removeProductRow = (idx: number) => {
    setFormProducts(formProducts.filter((_, i) => i !== idx));
  };

  const getStockForProduct = (productName: string) => {
    const config = materialConfigs.find(
      (c) => c.productName.toLowerCase() === productName.toLowerCase()
    );
    return config ? config.finishedUnits + config.bodyUnits : 0;
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const eventsOnDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.event_date + "T12:00:00"), day));

  const deliveriesOnDay = (day: Date) =>
    deliveryEntries.filter((d) => isSameDay(new Date(d.deliveryDate + "T12:00:00"), day));

  const productNames = [...new Set(materialConfigs.map((c) => c.productName))];

  const DELIVERY_STATUS_LABELS: Record<DeliveryEntry["status"], string> = {
    pendiente: "Pendiente",
    en_produccion: "En producción",
    listo: "Listo",
    entregado: "Entregado",
  };

  const DELIVERY_STATUS_COLORS: Record<DeliveryEntry["status"], string> = {
    pendiente: "bg-yellow-100 text-yellow-800",
    en_produccion: "bg-blue-100 text-blue-800",
    listo: "bg-green-100 text-green-800",
    entregado: "bg-muted text-muted-foreground",
  };

  // Group deliveries by date for the "Entregas" tab
  const deliveriesByDate = deliveryEntries.reduce<Record<string, DeliveryEntry[]>>((acc, d) => {
    if (!acc[d.deliveryDate]) acc[d.deliveryDate] = [];
    acc[d.deliveryDate].push(d);
    return acc;
  }, {});

  const sortedDeliveryDates = Object.keys(deliveriesByDate).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
          <p className="text-muted-foreground">Calendario y planificación de eventos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Crear evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del evento *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Feria Salud Bogotá" />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad *</Label>
                  <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="Ej: Bogotá" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formDate ? format(formDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={formDate} onSelect={setFormDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de evento</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as EventType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feria">Feria</SelectItem>
                      <SelectItem value="carrera">Carrera</SelectItem>
                      <SelectItem value="activacion">Activación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Observaciones adicionales..." />
              </div>

              {/* Products planning */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Productos requeridos</Label>
                  <Button variant="outline" size="sm" onClick={addProductRow}>
                    <Plus className="mr-1 h-3 w-3" /> Agregar producto
                  </Button>
                </div>
                {formProducts.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Producto</Label>
                      <Select value={p.product_name} onValueChange={(v) => updateProductRow(idx, "product_name", v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {productNames.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Marca</Label>
                      <Select value={p.brand} onValueChange={(v) => updateProductRow(idx, "brand", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Magical">Magical</SelectItem>
                          <SelectItem value="Sweatspot">Sweatspot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input type="number" min={0} value={p.quantity_needed} onChange={(e) => updateProductRow(idx, "quantity_needed", parseInt(e.target.value) || 0)} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeProductRow(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={handleCreate} className="w-full">Crear evento</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        {/* CALENDAR VIEW */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                  <div key={d} className="bg-muted-foreground/10 p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                ))}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-background p-2 min-h-[80px]" />
                ))}
                {days.map((day) => {
                  const dayEvents = eventsOnDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "bg-background p-1.5 min-h-[80px] border-b border-r border-muted",
                        isToday && "bg-accent/30"
                      )}
                    >
                      <span className={cn("text-xs font-medium", isToday && "text-primary font-bold")}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => { setSelectedEvent(ev); setDetailOpen(true); }}
                            className={cn("w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate", EVENT_TYPE_COLORS[ev.event_type])}
                          >
                            {ev.name}
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2} más</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIST VIEW */}
        <TabsContent value="list">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Cargando eventos...</p>
              ) : events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay eventos registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => (
                      <TableRow key={ev.id} className="cursor-pointer" onClick={() => { setSelectedEvent(ev); setDetailOpen(true); }}>
                        <TableCell className="font-medium">{ev.name}</TableCell>
                        <TableCell>{format(new Date(ev.event_date + "T12:00:00"), "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.city}</span></TableCell>
                        <TableCell><Badge className={EVENT_TYPE_COLORS[ev.event_type]}>{EVENT_TYPE_LABELS[ev.event_type]}</Badge></TableCell>
                        <TableCell>{ev.event_products.length} producto(s)</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(ev.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedEvent.name}
                  <Badge className={EVENT_TYPE_COLORS[selectedEvent.event_type]}>
                    {EVENT_TYPE_LABELS[selectedEvent.event_type]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(selectedEvent.event_date + "T12:00:00"), "dd MMMM yyyy", { locale: es })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.city}
                  </span>
                </div>
                {selectedEvent.notes && (
                  <p className="text-sm text-muted-foreground">{selectedEvent.notes}</p>
                )}

                {selectedEvent.event_products.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-4 w-4" /> Planificación de productos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead className="text-right">Cant. estimada</TableHead>
                            <TableHead className="text-right">Stock disponible</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedEvent.event_products.map((p) => {
                            const stock = getStockForProduct(p.product_name);
                            const sufficient = stock >= p.quantity_needed;
                            const deficit = p.quantity_needed - stock;
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.product_name}</TableCell>
                                <TableCell>{p.brand}</TableCell>
                                <TableCell className="text-right">{p.quantity_needed}</TableCell>
                                <TableCell className="text-right">{stock}</TableCell>
                                <TableCell>
                                  {sufficient ? (
                                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Suficiente
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> Faltan {deficit}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay productos planificados para este evento.</p>
                )}

                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedEvent.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar evento
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Eventos;
