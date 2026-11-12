import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** ¿El cliente (por nombre) ya tiene pedidos mayoristas anteriores? */
export function usePreviousBuyer(clientName: string, brand: string) {
  const name = clientName.trim();
  const { data } = useQuery({
    queryKey: ["previous-buyer", brand, name.toLowerCase()],
    enabled: name.length >= 4,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("brand", brand)
        .eq("sale_type", "mayor")
        .ilike("client_name", name);
      return (count ?? 0) > 0;
    },
  });
  return !!data;
}
