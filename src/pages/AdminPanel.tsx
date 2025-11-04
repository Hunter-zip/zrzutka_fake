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
import { Shield, Trash2, Edit, Users, Coins as CoinsIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Panel Administracyjny</h1>
          </div>
          <p className="text-muted-foreground">Zarządzaj zbiórkami i użytkownikami platformy</p>
        </div>

        <Tabs defaultValue="collections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="collections">Zbiórki</TabsTrigger>
            <TabsTrigger value="users">Użytkownicy</TabsTrigger>
          </TabsList>

          <TabsContent value="collections">
            <Card>
              <CardHeader>
                <CardTitle>Wszystkie Zbiórki</CardTitle>
                <CardDescription>Zarządzaj wszystkimi zbiórkami na platformie</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tytuł</TableHead>
                      <TableHead>Właściciel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Postęp</TableHead>
                      <TableHead>Data utworzenia</TableHead>
                      <TableHead>Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell className="font-medium">{collection.title}</TableCell>
                        <TableCell>{collection.profiles?.display_name || "Użytkownik"}</TableCell>
                        <TableCell>
                          <Badge variant={collection.status === "active" ? "default" : "secondary"}>
                            {collection.status === "active" ? "Aktywna" : "Zamknięta"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {collection.current_amount} / {collection.goal_amount}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(collection.created_at), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/collection/${collection.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleCollectionStatus(collection.id, collection.status)}
                            >
                              {collection.status === "active" ? "Zamknij" : "Aktywuj"}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
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
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa użytkownika</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Data rejestracji</TableHead>
                      <TableHead>Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{user.id}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: pl })}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
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
        </Tabs>
      </main>
    </>
  );
};

export default AdminPanel;
