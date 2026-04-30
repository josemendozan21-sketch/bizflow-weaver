import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/lib/rolePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Tent } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { useFerias, useAllPosAssignments, useAssignPosUser } from "@/hooks/useFerias";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: AppRole | null;
  created_at: string;
}

const AdminUsuarios = () => {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: ferias = [] } = useFerias();
  const { data: posAssignments = [] } = useAllPosAssignments();
  const assignPos = useAssignPosUser();

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
        created_at: p.created_at,
      };
    });
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  if (role !== "admin") return <Navigate to="/" replace />;

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
        <p className="text-muted-foreground">Gestiona los usuarios y sus roles de acceso</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios registrados ({users.length})
          </CardTitle>
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
                      <Badge variant={roleBadgeVariant(u.role)}>
                        {u.role ? getRoleLabel(u.role) : "Sin rol"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role ?? "none"}
                        onValueChange={(v) => handleRoleChange(u.user_id, v)}
                      >
                        <SelectTrigger className="w-[180px]">
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
                        </SelectContent>
                      </Select>
                      {u.role === "feria_pos" && (
                        <div className="mt-2 flex items-center gap-2">
                          <Tent className="h-3 w-3 text-muted-foreground" />
                          <Select
                            value={posAssignments.find((a) => a.user_id === u.user_id)?.feria_id ?? ""}
                            onValueChange={(feria_id) => assignPos.mutate({ user_id: u.user_id, feria_id })}
                          >
                            <SelectTrigger className="w-[180px] h-8 text-xs">
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
