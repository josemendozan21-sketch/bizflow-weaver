import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  target_role: string;
  target_user_id: string | null;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", role, user?.id],
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
      return data as Notification[];
    },
    enabled: !!role,
  });

  // Realtime subscription
  useEffect(() => {
    if (!role) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!role) return;
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return { notifications, isLoading, unreadCount, markAsRead, markAllAsRead };
}

interface OrderNotificationData {
  orderId: string;
  brand: string;
  product: string;
  quantity: number;
  clientName: string;
  needsCuerpos: boolean;
  shortage?: number;
  hasLogo: boolean;
  advisorId: string;
}

export async function createOrderNotifications(data: OrderNotificationData) {
  const notifications: Array<{
    target_role: string;
    target_user_id?: string;
    title: string;
    message: string;
    type: string;
    reference_id: string;
  }> = [];

  const brandLabel = data.brand === "magical" ? "Magical Warmers" : "Sweatspot";
  const shortDesc = `${data.quantity} uds de ${data.product} — ${brandLabel} para ${data.clientName}`;

  // Producción: siempre
  notifications.push({
    target_role: "produccion",
    title: "Nuevo pedido en producción",
    message: `Nuevo pedido: ${shortDesc}`,
    type: "nuevo_pedido",
    reference_id: data.orderId,
  });

  // Producción: bajo inventario
  if (data.needsCuerpos) {
    notifications.push({
      target_role: "produccion",
      title: "Bajo inventario de cuerpos",
      message: `Se requiere producir cuerpos para ${data.product}. Faltan aprox. ${data.shortage || "?"} uds.`,
      type: "bajo_inventario",
      reference_id: data.orderId,
    });
  }

  // Diseñador: si hay logo
  if (data.hasLogo) {
    notifications.push({
      target_role: "disenador",
      title: "Nueva solicitud de diseño",
      message: `Logo pendiente para ${data.clientName} — ${data.product} (${brandLabel})`,
      type: "diseno_logo",
      reference_id: data.orderId,
    });
  }

  // Contabilidad
  notifications.push({
    target_role: "contabilidad",
    title: "Nuevo pedido registrado",
    message: `Pedido al por mayor: ${shortDesc}`,
    type: "nuevo_pedido",
    reference_id: data.orderId,
  });

  // Asesor: confirmación
  notifications.push({
    target_role: "asesor_comercial",
    target_user_id: data.advisorId,
    title: "Pedido creado exitosamente",
    message: `Tu pedido de ${shortDesc} fue enviado a producción.`,
    type: "confirmacion",
    reference_id: data.orderId,
  });

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) {
    console.error("Error creating notifications:", error);
  }
}
