import { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Clock, LogIn, LogOut, Loader2, Users, Video, Upload } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Area = "estampacion" | "produccion" | "logistica";

interface StaffMember {
  id: string;
  full_name: string;
  area: Area;
  active: boolean;
}

interface AttendanceRow {
  id: string;
  staff_id: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_photo_url: string | null;
  check_out_photo_url: string | null;
  notes: string | null;
}

const AREA_LABEL: Record<Area, string> = {
  estampacion: "Estampación",
  produccion: "Producción",
  logistica: "Logística",
};

// Meta semanal: 44h hasta el 14 de junio de 2026; 42h a partir del 15 de junio.
const WEEKLY_TARGET_HOURS_BEFORE = 44;
const WEEKLY_TARGET_HOURS_AFTER = 42;
const WEEKLY_TARGET_CHANGE_DATE = "2026-06-15";

function weeklyTargetFor(weekStartISO: string): number {
  return weekStartISO >= WEEKLY_TARGET_CHANGE_DATE
    ? WEEKLY_TARGET_HOURS_AFTER
    : WEEKLY_TARGET_HOURS_BEFORE;
}

function todayBogota(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function startOfWeekBogota(d = new Date()): string {
  // ISO Monday-start week
  const bogotaToday = todayBogota();
  const t = new Date(bogotaToday + "T12:00:00");
  const day = t.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  t.setUTCDate(t.getUTCDate() - diff);
  return t.toISOString().slice(0, 10);
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hoursBetween(a: string | null, b: string | null) {
  if (!a || !b) return 0;
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 3600000);
}

export default function Personal() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const defaultArea: Area =
    role === "produccion" ? "produccion" :
    role === "estampacion" ? "estampacion" :
    role === "logistica" ? "logistica" :
    "produccion";

  const [area, setArea] = useState<Area>(defaultArea);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Personal
        </h1>
        <p className="text-sm text-muted-foreground">
          Marcación de ingreso y salida con foto. Meta semanal: 44h hasta el 14 jun 2026; 42h desde el 15 jun 2026.
        </p>
      </div>

      <Tabs defaultValue="marcacion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marcacion">Marcación de hoy</TabsTrigger>
          {isAdmin && <TabsTrigger value="reporte">Reporte semanal</TabsTrigger>}
        </TabsList>

        <TabsContent value="marcacion" className="space-y-4">
          {isAdmin ? (
            <Tabs value={area} onValueChange={(v) => setArea(v as Area)}>
              <TabsList>
                <TabsTrigger value="estampacion">Estampación</TabsTrigger>
                <TabsTrigger value="produccion">Producción</TabsTrigger>
                <TabsTrigger value="logistica">Logística</TabsTrigger>
              </TabsList>
              <TabsContent value={area} className="mt-4">
                <TodayMarking area={area} />
              </TabsContent>
            </Tabs>
          ) : (
            <TodayMarking area={defaultArea} />
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="reporte">
            <WeeklyReport />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function TodayMarking({ area }: { area: Area }) {
  const today = todayBogota();
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ["staff_members", area],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .eq("area", area)
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["staff_attendance_today", area, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .eq("work_date", today);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["staff_attendance_today"] });
    queryClient.invalidateQueries({ queryKey: ["staff_attendance_week"] });
  };

  if (staffQuery.isLoading || attendanceQuery.isLoading) {
    return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>;
  }

  const staff = staffQuery.data ?? [];
  const att = attendanceQuery.data ?? [];

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {staff.map((m) => {
        const row = att.find((a) => a.staff_id === m.id) || null;
        return <StaffCard key={m.id} member={m} attendance={row} onChange={refresh} />;
      })}
    </div>
  );
}

function StaffCard({
  member,
  attendance,
  onChange,
}: {
  member: StaffMember;
  attendance: AttendanceRow | null;
  onChange: () => void;
}) {
  const hasCheckIn = !!attendance?.check_in_at;
  const hasCheckOut = !!attendance?.check_out_at;
  const hoursToday = hoursBetween(attendance?.check_in_at ?? null, attendance?.check_out_at ?? null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{member.full_name}</CardTitle>
          {hasCheckIn && !hasCheckOut && <Badge>Trabajando</Badge>}
          {hasCheckOut && <Badge variant="outline">Finalizó</Badge>}
          {!hasCheckIn && <Badge variant="secondary">Pendiente</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Ingreso</p>
            <p className="font-medium">{fmtTime(attendance?.check_in_at ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Salida</p>
            <p className="font-medium">{fmtTime(attendance?.check_out_at ?? null)}</p>
          </div>
        </div>
        {hasCheckOut && (
          <p className="text-xs text-muted-foreground">
            <Clock className="inline h-3 w-3 mr-1" />
            Horas trabajadas: <span className="font-semibold text-foreground">{hoursToday.toFixed(2)}h</span>
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          {attendance?.check_in_photo_url && (
            <a href={attendance.check_in_photo_url} target="_blank" rel="noreferrer">
              <img src={attendance.check_in_photo_url} alt="ingreso" className="h-12 w-12 object-cover rounded border" />
            </a>
          )}
          {attendance?.check_out_photo_url && (
            <a href={attendance.check_out_photo_url} target="_blank" rel="noreferrer">
              <img src={attendance.check_out_photo_url} alt="salida" className="h-12 w-12 object-cover rounded border" />
            </a>
          )}
        </div>
        <div className="flex gap-2">
          {!hasCheckIn && (
            <ClockActionDialog
              type="in"
              member={member}
              attendance={attendance}
              onDone={onChange}
            />
          )}
          {hasCheckIn && !hasCheckOut && (
            <ClockActionDialog
              type="out"
              member={member}
              attendance={attendance}
              onDone={onChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ClockActionDialog({
  type,
  member,
  attendance,
  onDone,
}: {
  type: "in" | "out";
  member: StaffMember;
  attendance: AttendanceRow | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (err: any) {
      toast.error("No se pudo acceder a la cámara", { description: err.message });
      setMode("upload");
    }
  };

  useEffect(() => {
    if (open && mode === "camera" && !streamRef.current) {
      startCamera();
    }
    if (!open) {
      stopCamera();
      setFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        setFile(captured);
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  const submit = async () => {
    if (!file) {
      toast.error("Toma una fotografía antes de marcar");
      return;
    }
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${member.id}/${todayBogota()}_${type}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("attendance-photos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("attendance-photos").getPublicUrl(path);
      const photoUrl = urlData.publicUrl;
      const nowIso = new Date().toISOString();

      if (type === "in") {
        if (attendance) {
          const { error } = await supabase
            .from("staff_attendance")
            .update({ check_in_at: nowIso, check_in_photo_url: photoUrl, recorded_by: user?.id ?? null })
            .eq("id", attendance.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("staff_attendance").insert({
            staff_id: member.id,
            work_date: todayBogota(),
            check_in_at: nowIso,
            check_in_photo_url: photoUrl,
            recorded_by: user?.id ?? null,
          });
          if (error) throw error;
        }
        toast.success(`Ingreso registrado para ${member.full_name}`);
      } else {
        if (!attendance) throw new Error("No hay registro de ingreso");
        const { error } = await supabase
          .from("staff_attendance")
          .update({ check_out_at: nowIso, check_out_photo_url: photoUrl })
          .eq("id", attendance.id);
        if (error) throw error;
        toast.success(`Salida registrada para ${member.full_name}`);
      }
      setOpen(false);
      setFile(null);
      onDone();
    } catch (err: any) {
      toast.error("Error al registrar", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={type === "in" ? "default" : "outline"}>
          {type === "in" ? <LogIn className="h-3 w-3 mr-1" /> : <LogOut className="h-3 w-3 mr-1" />}
          {type === "in" ? "Marcar ingreso" : "Marcar salida"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === "in" ? "Ingreso" : "Salida"} — {member.full_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "camera" ? "default" : "outline"}
              onClick={() => { setFile(null); setMode("camera"); }}
            >
              <Video className="h-3 w-3 mr-1" /> Cámara
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "upload" ? "default" : "outline"}
              onClick={() => { stopCamera(); setFile(null); setMode("upload"); }}
            >
              <Upload className="h-3 w-3 mr-1" /> Subir archivo
            </Button>
          </div>

          {mode === "camera" ? (
            <div className="space-y-2">
              <Label>Captura desde la cámara *</Label>
              {!file ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full max-h-64 rounded border bg-black object-contain"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={capturePhoto} disabled={!streaming}>
                      <Camera className="h-3 w-3 mr-1" /> Tomar foto
                    </Button>
                    {!streaming && (
                      <Button type="button" size="sm" variant="outline" onClick={startCamera}>
                        Reintentar cámara
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="max-h-64 rounded border object-contain"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => { setFile(null); startCamera(); }}
                  >
                    Repetir foto
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Fotografía *</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="max-h-48 rounded border object-contain"
                />
              )}
            </div>
          )}

          <Button className="w-full" onClick={submit} disabled={saving || !file}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
            Confirmar {type === "in" ? "ingreso" : "salida"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WeeklyReport() {
  const [weekStart, setWeekStart] = useState<string>(startOfWeekBogota());

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart + "T12:00:00");
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  }, [weekStart]);

  const staffQuery = useQuery({
    queryKey: ["staff_members_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_members").select("*").order("area").order("full_name");
      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },
  });

  const attQuery = useQuery({
    queryKey: ["staff_attendance_week", weekStart, weekEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*")
        .gte("work_date", weekStart)
        .lte("work_date", weekEnd)
        .order("work_date");
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });

  if (staffQuery.isLoading || attQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const staff = staffQuery.data ?? [];
  const att = attQuery.data ?? [];

  const byStaff = new Map<string, AttendanceRow[]>();
  att.forEach((r) => {
    if (!byStaff.has(r.staff_id)) byStaff.set(r.staff_id, []);
    byStaff.get(r.staff_id)!.push(r);
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Semana desde (lunes)</Label>
            <Input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-44"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {weekStart} → {weekEnd} · meta {weeklyTargetFor(weekStart)}h
          </p>
        </CardContent>
      </Card>

      {(["estampacion", "produccion", "logistica"] as Area[]).map((area) => {
        const members = staff.filter((s) => s.area === area);
        if (members.length === 0) return null;
        return (
          <Card key={area}>
            <CardHeader>
              <CardTitle className="text-base">{AREA_LABEL[area]}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3">Persona</th>
                    <th className="py-2 pr-3">Días</th>
                    <th className="py-2 pr-3">Horas totales</th>
                    <th className="py-2 pr-3">Meta</th>
                    <th className="py-2 pr-3">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const rows = byStaff.get(m.id) ?? [];
                    const total = rows.reduce(
                      (acc, r) => acc + hoursBetween(r.check_in_at, r.check_out_at),
                      0
                    );
                    const target = weeklyTargetFor(weekStart);
                    const reachedTarget = total >= target;
                    return (
                      <tr key={m.id} className="border-b last:border-b-0 align-top">
                        <td className="py-2 pr-3 font-medium">{m.full_name}</td>
                        <td className="py-2 pr-3">{rows.length}</td>
                        <td className="py-2 pr-3 font-semibold">{total.toFixed(2)}h</td>
                        <td className="py-2 pr-3">
                          <Badge variant={reachedTarget ? "default" : "secondary"}>
                            {reachedTarget ? "Cumplida" : `Faltan ${(target - total).toFixed(1)}h`}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {rows.length === 0 ? (
                            <span className="text-muted-foreground">Sin marcaciones</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {rows.map((r) => (
                                <li key={r.id}>
                                  {r.work_date}: {fmtTime(r.check_in_at)} → {fmtTime(r.check_out_at)}{" "}
                                  <span className="text-muted-foreground">
                                    ({hoursBetween(r.check_in_at, r.check_out_at).toFixed(2)}h)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}