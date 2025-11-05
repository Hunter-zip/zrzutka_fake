import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import SearchBar from "./SearchBar";
import AddCreditsDialog from "./AddCreditsDialog";

interface NavbarProps {
  balance?: number;
  onBalanceUpdate?: () => void;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

const Navbar = ({ balance = 0, onBalanceUpdate, onSearch, showSearch = false }: NavbarProps) => {
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
    <nav className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl flex-shrink-0">
          <div className="p-2 rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Coins className="h-5 w-5 text-white" />
          </div>
          <span style={{ 
            background: "var(--gradient-primary)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Zrzutka
          </span>
        </Link>

        {showSearch && onSearch && (
          <div className="flex-1 max-w-md hidden md:block">
            <SearchBar onSearch={onSearch} />
          </div>
        )}

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to="/forum">
            <Button variant="ghost" size="sm">
              Forum
            </Button>
          </Link>
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">{balance}</span>
              </div>
              <AddCreditsDialog onCreditsAdded={() => onBalanceUpdate?.()} />
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