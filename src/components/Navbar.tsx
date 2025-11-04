import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface NavbarProps {
  balance?: number;
}

const Navbar = ({ balance = 0 }: NavbarProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Wylogowano pomyślnie");
    navigate("/auth");
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="p-2 rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Coins className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Zrzutka
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">{balance}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button>Zaloguj się</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;