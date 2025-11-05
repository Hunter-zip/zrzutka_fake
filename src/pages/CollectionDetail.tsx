import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import EditCollectionDialog from "@/components/EditCollectionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Coins, Calendar, User, MessageCircle, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
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
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user && id) {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("collection_id", id)
        .eq("user_id", user.id)
        .single();
      
      setIsLiked(!!data);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch collection
      const { data: collectionData } = await supabase
        .from("collections")
        .select("*")
        .eq("id", id)
        .single();

      // Fetch owner profile separately
      if (collectionData) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", collectionData.owner_id)
          .single();
        
        if (ownerProfile) {
          (collectionData as any).owner_display_name = ownerProfile.display_name;
        }
      }

      if (collectionData) {
        setCollection(collectionData);
      }

      // Fetch contributions
      const { data: contributionsData } = await supabase
        .from("contributions")
        .select("*")
        .eq("collection_id", id)
        .eq("public", true)
        .order("created_at", { ascending: false });

      // Fetch user profiles for contributions
      if (contributionsData && contributionsData.length > 0) {
        const userIds = [...new Set(contributionsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        // Add display names to contributions
        contributionsData.forEach((contribution: any) => {
          const profile = profilesData?.find(p => p.id === contribution.user_id);
          contribution.display_name = profile?.display_name || "Użytkownik";
        });
      }

      if (contributionsData) {
        setContributions(contributionsData);
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("collection_id", id)
        .order("created_at", { ascending: false });

      // Fetch user profiles for comments
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        // Add display names to comments
        commentsData.forEach((comment: any) => {
          const profile = profilesData?.find(p => p.id === comment.user_id);
          comment.display_name = profile?.display_name || "Użytkownik";
        });
      }

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

      // Add transaction record
      await supabase
        .from("transactions")
        .insert({
          user_id: user!.id,
          collection_id: id,
          type: "contribution",
          amount: -amount,
          description: `Wpłata na zbiórke: ${collection.title}`,
        });

      // Check if collection reached goal and close it
      const newTotal = collection.current_amount + amount;
      if (collection.end_condition === "goal" && newTotal >= collection.goal_amount) {
        await supabase
          .from("collections")
          .update({ status: "closed" })
          .eq("id", id);
        
        toast.success("Zbiórka osiągnęła cel i została zamknięta!");
      } else {
        toast.success("Wpłata zakończona pomyślnie!");
      }

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

  const handleDeleteCollection = async () => {
    try {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Zbiórka usunięta");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Błąd podczas usuwania zbiórki");
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      toast.error("Musisz być zalogowany, aby polubić zbiórke");
      navigate("/auth");
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("collection_id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        // Decrease likes count
        await supabase
          .from("collections")
          .update({ likes_count: collection.likes_count - 1 })
          .eq("id", id);

        setIsLiked(false);
        toast.success("Usunięto polubienie");
      } else {
        // Like
        const { error } = await supabase
          .from("likes")
          .insert({
            collection_id: id,
            user_id: user.id,
          });

        if (error) throw error;

        // Increase likes count
        await supabase
          .from("collections")
          .update({ likes_count: collection.likes_count + 1 })
          .eq("id", id);

        setIsLiked(true);
        toast.success("Polubiono zbiórke");
      }

      fetchData();
    } catch (error: any) {
      toast.error("Błąd podczas zmiany polubienia");
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
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge variant="secondary">{collection.category}</Badge>
                  <Badge variant={collection.status === "active" ? "default" : "outline"}>
                    {collection.status === "active" ? "Aktywna" : "Zamknięta"}
                  </Badge>
                  {collection.start_date && (
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Start: </span>{format(new Date(collection.start_date), "dd.MM.yyyy", { locale: pl })}
                    </div>
                  )}
                  {collection.deadline && (
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Koniec: </span>{formatDistanceToNow(new Date(collection.deadline), { addSuffix: true, locale: pl })}
                    </div>
                  )}
                </div>
                
                {user && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      size="sm"
                      onClick={handleToggleLike}
                    >
                      <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                      {collection.likes_count || 0}
                    </Button>
                    
                    {user.id === collection.owner_id && (
                      <>
                        <EditCollectionDialog collection={collection} onUpdate={fetchData} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Usuń
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Ta akcja jest nieodwracalna. Zbiórka zostanie trwale usunięta.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anuluj</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteCollection}>
                                Usuń
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">{collection.title}</h1>
              
              <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>przez {collection.owner_display_name || "Użytkownik"}</span>
              </div>

              <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">{collection.description}</p>
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
                            {comment.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{comment.display_name || "Użytkownik"}</span>
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
                              {contribution.display_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{contribution.display_name || "Anonim"}</span>
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