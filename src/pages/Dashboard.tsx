import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Wallet, TrendingUp } from "lucide-react";
import CollectionCard from "@/components/CollectionCard";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [myCollections, setMyCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchUserData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (wallet) {
        setBalance(wallet.balance);
      }

      // Fetch user's collections
      const { data: collections } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (collections) {
        setMyCollections(collections);
      }
    } catch (error: any) {
      toast.error("Błąd podczas ładowania danych");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar balance={balance} />
        <div className="min-h-screen flex items-center justify-center">
          <p>Ładowanie...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar balance={balance} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mój Dashboard</h1>
          <p className="text-muted-foreground">Zarządzaj swoimi zbiórkami i kredytami</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Kredytów</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{balance}</div>
              <p className="text-xs text-muted-foreground mt-1">kredytów w portfelu</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Moje Zbiórki</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myCollections.length}</div>
              <p className="text-xs text-muted-foreground mt-1">aktywnych zbiórek</p>
            </CardContent>
          </Card>

          <Card className="flex items-center justify-center">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => navigate("/create")}
            >
              <Plus className="h-5 w-5" />
              Utwórz Zbiórkę
            </Button>
          </Card>
        </div>

        <section>
          <h2 className="text-2xl font-bold mb-4">Moje Zbiórki</h2>
          {myCollections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych zbiórek</p>
                <Button onClick={() => navigate("/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Utwórz Pierwszą Zbiórkę
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCollections.map((collection) => (
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
        </section>
      </main>
    </>
  );
};

export default Dashboard;