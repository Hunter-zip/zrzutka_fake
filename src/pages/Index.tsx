import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Users, Coins } from "lucide-react";
import CollectionCard from "@/components/CollectionCard";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Index = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchCollections();
    fetchBalance();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchCollections = async () => {
    try {
      const { data } = await supabase
        .from("collections")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) {
        setCollections(data);
        setFilteredCollections(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredCollections(collections);
      return;
    }

    const filtered = collections.filter(
      (collection) =>
        collection.title.toLowerCase().includes(query.toLowerCase()) ||
        collection.description.toLowerCase().includes(query.toLowerCase()) ||
        collection.category.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCollections(filtered);
  };

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (wallet) {
      setBalance(wallet.balance);
    }
  };

  return (
    <>
      <Navbar 
        balance={balance} 
        onBalanceUpdate={fetchBalance}
        onSearch={handleSearch}
        showSearch={true}
      />
      
      {/* Hero Section */}
      <section className="py-20 px-4" style={{ background: "var(--gradient-hero)" }}>
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ 
            background: "var(--gradient-primary)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Wspieraj Zbiórki Kredytami
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Twórz zbiórki i wpłacaj wirtualne kredyty na cele, które Ci się podobają. 
            Społeczność, gamifikacja i zero prawdziwych pieniędzy.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Utwórz Zbiórkę
              </Button>
            </Link>
            {!user && (
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Zacznij Teraz
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-bold mb-2">100+</h3>
              <p className="text-muted-foreground">Aktywnych Zbiórek</p>
            </div>
            <div>
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-bold mb-2">500+</h3>
              <p className="text-muted-foreground">Użytkowników</p>
            </div>
            <div>
              <Coins className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-bold mb-2">50k+</h3>
              <p className="text-muted-foreground">Kredytów Wpłaconych</p>
            </div>
          </div>
        </div>
      </section>

      {/* Collections Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Popularne Zbiórki</h2>
              <p className="text-muted-foreground">Odkryj zbiórki, które wspiera społeczność</p>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Ładowanie zbiórek...</p>
          ) : filteredCollections.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {collections.length === 0 
                ? "Nie ma jeszcze żadnych zbiórek. Bądź pierwszy!" 
                : "Nie znaleziono zbiórek pasujących do wyszukiwania"}
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  id={collection.id}
                  title={collection.title}
                  description={collection.description}
                  goalAmount={collection.goal_amount}
                  currentAmount={collection.current_amount}
                  category={collection.category}
                  deadline={collection.deadline}
                  imageUrl={collection.image_url}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Index;
