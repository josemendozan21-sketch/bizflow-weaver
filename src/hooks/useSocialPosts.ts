import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SocialBrand = "bionovations" | "sweatspot" | "magical";
export type SocialStatus = "idea" | "programado" | "publicado";

export interface SocialPost {
  id: string;
  brand: SocialBrand;
  scheduled_date: string;
  title: string;
  description: string | null;
  hashtags: string | null;
  networks: string[];
  status: SocialStatus;
  is_special_date: boolean;
  asset_url: string | null;
  asset_path: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useSocialPosts(brand: SocialBrand) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("social_posts")
      .select("*")
      .eq("brand", brand)
      .order("scheduled_date", { ascending: true });
    if (error) {
      toast.error("Error cargando publicaciones: " + error.message);
    } else {
      setPosts((data ?? []) as SocialPost[]);
    }
    setLoading(false);
  }, [brand]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
    const ch = supabase
      .channel(`social_posts_${brand}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_posts", filter: `brand=eq.${brand}` },
        () => fetchPosts(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [brand, fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
}
