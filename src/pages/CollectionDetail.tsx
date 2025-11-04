import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Coins, Calendar, User, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

const CollectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contributionAmount, setContributionAmount] = useState("");
  const [commentText, setCommentText] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchData = async () => {
    try {
      // Fetch collection
      const { data: collectionData } = await supabase
        .from("collections")
        .select("*, profiles:owner_id(display_name)")
        .eq("id", id)
        .single();

      if (collectionData) {
        setCollection(collectionData);
      }

      // Fetch contributions
      const { data: contributionsData } = await supabase
        .from("contributions")
        .select("*, profiles:user_id(display_name)")
        .eq("collection_id", id)
        .eq("public", true)
        .order("created_at", { ascending: false });

      if (contributionsData) {
        setContributions(contributionsData);
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, profiles:user_id(display_name)")
        .eq("collection_id", id)
        .order("created_at", { ascending: false });

      if (commentsData) {
        setComments(commentsData);
      }

      // Fetch user balance
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (wallet) {
          setBalance(wallet.balance);
        }
      }
    } catch (error: any) {
      toast.error("Błąd podczas ładowania danych");
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Musisz być zalogowany, aby wpłacać kredyty");
      navigate("/auth");
      return;
    }

    const amount = parseInt(contributionAmount);
    if (amount <= 0 || amount > balance) {
      toast.error("Nieprawidłowa kwota");
      return;
    }

    try {
      // Start transaction: decrease wallet, increase collection, add contribution
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update wallet
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: balance - amount })
        .eq("user_id", user!.id);

      if (walletError) throw walletError;

      // Update collection
      const { error: collectionError } = await supabase
        .from("collections")
        .update({ current_amount: collection.current_amount + amount })
        .eq("id", id);

      if (collectionError) throw collectionError;

      // Add contribution
      const { error: contributionError } = await supabase
        .from("contributions")
        .insert({
          collection_id: id,
          user_id: user!.id,
          amount,
          public: true,
        });

      if (contributionError) throw contributionError;

      toast.success("Wpłata zakończona pomyślnie!");
      setContributionAmount("");
      fetchData();
    } catch (error: any) {
      toast.error("Błąd podczas wpłaty");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Musisz być zalogowany, aby komentować");
      navigate("/auth");
      return;
    }

    if (!commentText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("comments")
        .insert({
          collection_id: id,
          user_id: user!.id,
          text: commentText,
        });

      if (error) throw error;

      toast.success("Komentarz dodany!");
      setCommentText("");
      fetchData();
    } catch (error: any) {
      toast.error("Błąd podczas dodawania komentarza");
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

  if (!collection) {
    return (
      <>
        <Navbar balance={balance} />
        <div className="min-h-screen flex items-center justify-center">
          <p>Zbiórka nie została znaleziona</p>
        </div>
      </>
    );
  }

  const progress = (collection.current_amount / collection.goal_amount) * 100;

  return (
    <>
      <Navbar balance={balance} />
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {collection.image_url && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={collection.image_url}
                  alt={collection.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary">{collection.category}</Badge>
                {collection.deadline && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(collection.deadline), { addSuffix: true, locale: pl })}
                  </div>
                )}
              </div>
              
              <h1 className="text-4xl font-bold mb-4">{collection.title}</h1>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <User className="h-4 w-4" />
                <span>przez {collection.profiles?.display_name || "Użytkownik"}</span>
              </div>

              <p className="text-lg leading-relaxed whitespace-pre-wrap">{collection.description}</p>
            </div>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Komentarze ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {user && (
                  <form onSubmit={handleComment} className="space-y-4">
                    <Textarea
                      placeholder="Dodaj komentarz..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                    />
                    <Button type="submit">Dodaj Komentarz</Button>
                  </form>
                )}

                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Brak komentarzy</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {comment.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{comment.profiles?.display_name || "Użytkownik"}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: pl })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle>Postęp Zbiórki</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{Math.round(progress)}% celu</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-4 border-t">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold text-primary">{collection.current_amount}</span>
                  </div>
                  <span className="text-muted-foreground">/ {collection.goal_amount}</span>
                </div>

                {user && collection.status === "active" && (
                  <form onSubmit={handleContribute} className="space-y-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Wpłać kredyty
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max={balance}
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        placeholder="Ilość kredytów"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Dostępne: {balance} kredytów
                      </p>
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                      Wpłać Teraz
                    </Button>
                  </form>
                )}

                {!user && (
                  <Button className="w-full" size="lg" onClick={() => navigate("/auth")}>
                    Zaloguj się, aby wpłacić
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Contributions List */}
            <Card>
              <CardHeader>
                <CardTitle>Ostatnie Wpłaty</CardTitle>
                <CardDescription>{contributions.length} wpłat</CardDescription>
              </CardHeader>
              <CardContent>
                {contributions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Brak wpłat</p>
                ) : (
                  <div className="space-y-3">
                    {contributions.slice(0, 10).map((contribution) => (
                      <div key={contribution.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {contribution.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{contribution.profiles?.display_name || "Anonim"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                          <Coins className="h-3 w-3" />
                          {contribution.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
};

export default CollectionDetail;