import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAdminStatus = (user: User | null | undefined) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setIsAdmin(false);
      return () => {
        isMounted = false;
      };
    }

    const verifyRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("Failed to determine admin status", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(Boolean(data));
      } catch (error) {
        if (!isMounted) return;
        console.error("Unexpected error while checking admin status", error);
        setIsAdmin(false);
      }
    };

    void verifyRole();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user]);

  return isAdmin;
};
