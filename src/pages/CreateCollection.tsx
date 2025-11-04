import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CreateCollection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goalAmount: "",
    category: "",
    deadline: "",
    imageUrl: "",
  });

  useEffect(() => {
    checkAuth();
    fetchBalance();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Musisz być zalogowany");

      const { error } = await supabase.from("collections").insert({
        owner_id: user.id,
        title: formData.title,
        description: formData.description,
        goal_amount: parseInt(formData.goalAmount),
        current_amount: 0,
        category: formData.category,
        deadline: formData.deadline || null,
        image_url: formData.imageUrl || null,
        status: "active",
      });

      if (error) throw error;

      toast.success("Zbiórka utworzona pomyślnie!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Błąd podczas tworzenia zbiórki");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar balance={balance} />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Utwórz Nową Zbiórkę</CardTitle>
            <CardDescription>
              Wypełnij formularz, aby utworzyć zbiórkę z wirtualnymi kredytami
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł zbiórki *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="np. Wakacje z klasą"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Opisz cel zbiórki..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goalAmount">Cel w kredytach *</Label>
                <Input
                  id="goalAmount"
                  type="number"
                  min="1"
                  value={formData.goalAmount}
                  onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
                  required
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edukacja">Edukacja</SelectItem>
                    <SelectItem value="zdrowie">Zdrowie</SelectItem>
                    <SelectItem value="hobby">Hobby</SelectItem>
                    <SelectItem value="podróże">Podróże</SelectItem>
                    <SelectItem value="technologia">Technologia</SelectItem>
                    <SelectItem value="inne">Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Termin zakończenia (opcjonalnie)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL zdjęcia (opcjonalnie)</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">
                  Anuluj
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Tworzenie..." : "Utwórz Zbiórkę"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default CreateCollection;