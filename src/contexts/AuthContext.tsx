import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
    if (error) {
      console.error("[AuthContext] Error loading user role:", error);
      return null;
    }
    return data as AppRole | null;
  };

  useEffect(() => {
    let mounted = true;
    let roleRequestId = 0;
    const currentUserIdRef = { current: null as string | null };

    const applySession = (nextSession: Session | null) => {
      const currentRequestId = ++roleRequestId;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      currentUserIdRef.current = nextSession?.user?.id ?? null;

      if (nextSession?.user) {
        setLoading(true);
        window.setTimeout(() => {
          fetchRole(nextSession.user.id).then((userRole) => {
            if (!mounted || currentRequestId !== roleRequestId) return;
            setRole(userRole);
            setLoading(false);
          });
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Si el usuario sigue siendo el mismo, NO reiniciar loading ni refetch del rol.
        // En móvil (Samsung Browser/Chrome) al abrir el selector de archivos la pestaña
        // se pausa y al volver Supabase dispara SIGNED_IN/TOKEN_REFRESHED. Si entramos en
        // applySession se desmonta toda la página (LoadingScreen) y se pierde el archivo
        // y el estado del formulario.
        if (session?.user && currentUserIdRef.current === session.user.id) {
          setSession(session);
          setUser(session.user);
          return;
        }
        applySession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
