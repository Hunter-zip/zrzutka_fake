import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Trash2, Edit, Users, Coins as CoinsIcon, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [newBalance, setNewBalance] = useState("");

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        toast.error("Brak dostępu do panelu administracyjnego");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchData();
      await fetchBalance();
    } catch (error) {
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      if (wallet) setBalance(wallet.balance);
    }
  };

  const fetchData = async () => {
    // Fetch all collections
    const { data: collectionsData } = await supabase
      .from("collections")
      .select("*, profiles(display_name)")
      .order("created_at", { ascending: false });

    if (collectionsData) {
      setCollections(collectionsData);
    }

    // Fetch all users with profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesData) {
      setUsers(profilesData);
    }

    // Fetch all wallets with user profiles
    const { data: walletsData } = await supabase
      .from("wallets")
      .select("*, profiles(display_name)")
      .order("created_at", { ascending: false });

    if (walletsData) {
      setWallets(walletsData);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionId);

      if (error) throw error;

      toast.success("Zbiórka usunięta");
      fetchData();
    } catch (error: any) {
      toast.error("Błąd podczas usuwania zbiórki");
    }
  };

  const handleToggleCollectionStatus = async (collectionId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    
    try {
      const { error } = await supabase
        .from("collections")
        .update({ status: newStatus })
        .eq("id", collectionId);

      if (error) throw error;

      toast.success(`Status zbiórki zmieniony na ${newStatus === "active" ? "aktywna" : "zamknięta"}`);
      fetchData();
    } catch (error: any) {
      toast.error("Błąd podczas zmiany statusu");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Note: This will only delete the profile, not the auth.users entry
      // To fully delete users, you'd need a Supabase Edge Function
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      toast.success("Profil użytkownika usunięty");
      fetchData();
    } catch (error: any) {
      toast.error("Błąd podczas usuwania użytkownika");
    }
  };

  const handleUpdateWalletBalance = async () => {
    if (!selectedWallet || !newBalance) {
      toast.error("Wprowadź nowy balans");
      return;
    }

    const balanceNum = parseInt(newBalance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      toast.error("Nieprawidłowa kwota");
      return;
    }

    try {
      const { error } = await supabase
        .from("wallets")
        .update({ balance: balanceNum })
        .eq("user_id", selectedWallet.user_id);

      if (error) throw error;

      toast.success("Saldo zaktualizowane");
      setSelectedWallet(null);
      setNewBalance("");
      fetchData();
    } catch (error: any) {
      toast.error("Błąd podczas aktualizacji salda");
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

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Navbar balance={balance} />
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Panel Administracyjny</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Zarządzaj zbiórkami i użytkownikami platformy</p>
        </div>

        <Tabs defaultValue="collections" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="collections" className="text-xs sm:text-sm">Zbiórki</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Użytkownicy</TabsTrigger>
            <TabsTrigger value="wallets" className="text-xs sm:text-sm">Portfele</TabsTrigger>
          </TabsList>

          <TabsContent value="collections">
            <Card>
              <CardHeader>
                <CardTitle>Wszystkie Zbiórki</CardTitle>
                <CardDescription>Zarządzaj wszystkimi zbiórkami na platformie</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Tytuł</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[120px]">Właściciel</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[100px]">Postęp</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[120px]">Data utworzenia</TableHead>
                      <TableHead className="min-w-[150px]">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell className="font-medium">{collection.title}</TableCell>
                        <TableCell className="hidden md:table-cell">{collection.profiles?.display_name || "Użytkownik"}</TableCell>
                        <TableCell>
                          <Badge variant={collection.status === "active" ? "default" : "secondary"}>
                            {collection.status === "active" ? "Aktywna" : "Zamknięta"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {collection.current_amount} / {collection.goal_amount}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatDistanceToNow(new Date(collection.created_at), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/collection/${collection.id}`)}
                              className="p-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleCollectionStatus(collection.id, collection.status)}
                              className="hidden sm:flex"
                            >
                              {collection.status === "active" ? "Zamknij" : "Aktywuj"}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="p-2">
                                  <Trash2 className="h-4 w-4" />
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
                                  <AlertDialogAction onClick={() => handleDeleteCollection(collection.id)}>
                                    Usuń
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Wszyscy Użytkownicy</CardTitle>
                <CardDescription>Zarządzaj kontami użytkowników</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Nazwa użytkownika</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[200px]">ID</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[120px]">Data rejestracji</TableHead>
                      <TableHead className="min-w-[80px]">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{user.id}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="p-2">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ta akcja usunie profil użytkownika. Aby całkowicie usunąć użytkownika, skontaktuj się z administratorem systemu.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                  Usuń profil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallets">
            <Card>
              <CardHeader>
                <CardTitle>Portfele Użytkowników</CardTitle>
                <CardDescription>Zarządzaj środkami użytkowników</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Użytkownik</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[200px]">ID Użytkownika</TableHead>
                      <TableHead className="min-w-[80px]">Saldo</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[120px]">Ostatnia aktualizacja</TableHead>
                      <TableHead className="min-w-[120px]">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallets.map((wallet) => (
                      <TableRow key={wallet.id}>
                        <TableCell className="font-medium">
                          {wallet.profiles?.display_name || "Użytkownik"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{wallet.user_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                            <span className="font-semibold text-sm sm:text-base">{wallet.balance}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {formatDistanceToNow(new Date(wallet.updated_at), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedWallet(wallet);
                                  setNewBalance(wallet.balance.toString());
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edytuj saldo
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edytuj saldo użytkownika</DialogTitle>
                                <DialogDescription>
                                  Zmień saldo portfela użytkownika {wallet.profiles?.display_name || "Użytkownik"}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Obecne saldo: {wallet.balance}</label>
                                  <Input
                                    type="number"
                                    placeholder="Nowe saldo"
                                    value={newBalance}
                                    onChange={(e) => setNewBalance(e.target.value)}
                                    min="0"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleUpdateWalletBalance}>
                                  Zapisz zmiany
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
};

export default AdminPanel;
