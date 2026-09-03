import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/lib/rolePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Tent, Store, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { useFerias, useAllPosAssignments, useAssignPosUser } from "@/hooks/useFerias";
import { usePosLocations } from "@/hooks/usePuntosVenta";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: AppRole | null;
  advisor_code: string | null;
  created_at: string;
}

const AdminUsuarios = () => {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", displayName: "", role: "feria_pos" as AppRole });
  const { data: ferias = [] } = useFerias();
  const { data: posAssignments = [] } = useAllPosAssignments();
  const assignPos = useAssignPosUser();
  const { data: posLocations = [] } = usePosLocations();
  const qc = useQueryClient();
  const { data: locationAssignments = [] } = useQuery({
    queryKey: ["pos_all_location_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_location_assignments").select("user_id, location_id");
      if (error) throw error;
      return data as { user_id: string; location_id: string }[];
    },
  });
  const assignPosLocation = useMutation({
    mutationFn: async ({ user_id, location_id }: { user_id: string; location_id: string }) => {
      await supabase.from("pos_location_assignments").delete().eq("user_id", user_id);
      const { error } = await supabase.from("pos_location_assignments").insert({ user_id, location_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos_all_location_assignments"] });
      toast.success("Punto asignado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al asignar punto"),
  });

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
    if (pErr) { toast.error("Error al cargar usuarios"); setLoading(false); return; }

    const { data: roles } = await supabase.from("user_roles").select("*");

    const merged: UserWithRole[] = (profiles || []).map((p) => {
      const userRole = roles?.find((r) => r.user_id === p.user_id);
      return {
        user_id: p.user_id,
        email: p.email,
        display_name: p.display_name,
        role: (userRole?.role as AppRole) ?? null,
        advisor_code: (p as any).advisor_code ?? null,
        created_at: p.created_at,
      };
    });
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  if (role !== "admin") return <Navigate to="/" replace />;

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.role) {
      toast.error("Completa correo, contraseña y rol");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-real-user", {
        body: {
          email: newUser.email.trim().toLowerCase(),
          password: newUser.password,
          displayName: newUser.displayName || newUser.email,
          role: newUser.role,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Usuario creado correctamente");
      setCreateOpen(false);
      setNewUser({ email: "", password: "", displayName: "", role: "feria_pos" });
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message ?? "Error al crear usuario");
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const roleValue = newRole === "none" ? null : (newRole as AppRole);

    if (!roleValue) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (error) { toast.error("Error al quitar rol"); return; }
    } else {
      const existing = users.find((u) => u.user_id === userId);
      if (existing?.role) {
        const { error } = await supabase.from("user_roles").update({ role: roleValue }).eq("user_id", userId);
        if (error) { toast.error("Error al actualizar rol"); return; }
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: roleValue });
        if (error) { toast.error("Error al asignar rol"); return; }
      }
    }

    toast.success("Rol actualizado correctamente");
    fetchUsers();
  };

  const saveAdvisorCode = async (userId: string, raw: string) => {
    const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const current = users.find((u) => u.user_id === userId)?.advisor_code ?? "";
    if (code === (current ?? "")) return;
    const { error } = await supabase
      .from("profiles")
      .update({ advisor_code: code || null } as any)
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Esa sigla ya está en uso" : "No se pudo guardar la sigla");
      return;
    }
    toast.success("Sigla actualizada");
    fetchUsers();
  };

  const roleBadgeVariant = (r: AppRole | null) => {
    if (!r) return "outline" as const;
    return r === "admin" ? "destructive" as const : "default" as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" /> Administración de usuarios
        </h1>
        <p className="text-muted-foreground">
          Gestiona los usuarios, sus roles y la sigla con la que se identifican sus pedidos (ej. MW-PB-00123).
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios registrados ({users.length})
            </CardTitle>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Crear usuario</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Crear nuevo usuario</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Correo</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="usuario@bionovations.com" /></div>
                  <div><Label>Contraseña</Label><Input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
                  <div><Label>Nombre</Label><Input value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} placeholder="Nombre a mostrar" /></div>
                  <div>
                    <Label>Rol</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="asesor_comercial">Asesor Comercial</SelectItem>
                        <SelectItem value="produccion">Producción</SelectItem>
                        <SelectItem value="contabilidad">Contabilidad</SelectItem>
                        <SelectItem value="estampacion">Estampación</SelectItem>
                        <SelectItem value="usuario_visual">Usuario Visual</SelectItem>
                        <SelectItem value="feria_pos">Feria Punto de Venta</SelectItem>
                        <SelectItem value="pos_punto">Asesor Punto de Venta</SelectItem>
                        <SelectItem value="visualizador">Visualizador (solo lectura)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateUser} disabled={creating}>{creating ? "Creando..." : "Crear"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Cargando usuarios...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Rol actual</TableHead>
                  <TableHead>Cambiar rol</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.display_name || "—"}</TableCell>
                    <TableCell>
                      <Input
                        defaultValue={u.advisor_code ?? ""}
                        maxLength={4}
                        placeholder="Ej: PB"
                        aria-label={`Sigla de ${u.display_name || u.email}`}
                        className="w-20 h-8 uppercase font-mono"
                        onBlur={(e) => saveAdvisorCode(u.user_id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(u.role)}>
                        {u.role ? getRoleLabel(u.role) : "Sin rol"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role ?? "none"}
                        onValueChange={(v) => handleRoleChange(u.user_id, v)}
                      >
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin rol</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="asesor_comercial">Asesor Comercial</SelectItem>
                          <SelectItem value="produccion">Producción</SelectItem>
                          <SelectItem value="contabilidad">Contabilidad</SelectItem>
                          <SelectItem value="estampacion">Estampación</SelectItem>
                          <SelectItem value="usuario_visual">Usuario Visual</SelectItem>
                          <SelectItem value="feria_pos">Feria Punto de Venta</SelectItem>
                          <SelectItem value="pos_punto">Asesor Punto de Venta</SelectItem>
                          <SelectItem value="visualizador">Visualizador (solo lectura)</SelectItem>
                        </SelectContent>
                      </Select>
                      {u.role === "feria_pos" && (
                        <div className="mt-2 flex items-center gap-2">
                          <Tent className="h-3 w-3 text-muted-foreground" />
                          <Select
                            value={posAssignments.find((a) => a.user_id === u.user_id)?.feria_id ?? ""}
                            onValueChange={(feria_id) => assignPos.mutate({ user_id: u.user_id, feria_id })}
                          >
                            <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                              <SelectValue placeholder="Asignar feria" />
                            </SelectTrigger>
                            <SelectContent>
                              {ferias.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {u.role === "pos_punto" && (
                        <div className="mt-2 flex items-center gap-2">
                          <Store className="h-3 w-3 text-muted-foreground" />
                          <Select
                            value={locationAssignments.find((a) => a.user_id === u.user_id)?.location_id ?? ""}
                            onValueChange={(location_id) => assignPosLocation.mutate({ user_id: u.user_id, location_id })}
                          >
                            <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs">
                              <SelectValue placeholder="Asignar punto" />
                            </SelectTrigger>
                            <SelectContent>
                              {posLocations.map((l) => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString("es-CO")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsuarios;
