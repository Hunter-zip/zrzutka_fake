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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CreateCollection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [endCondition, setEndCondition] = useState<"date" | "goal">("date");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal_amount: "",
    category: "",
    image_url: "",
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
      if (!user) {
        toast.error("Musisz być zalogowany");
        navigate("/auth");
        return;
      }

      // Validate dates
      if (endCondition === "date" && !endDate) {
        toast.error("Wybierz datę zakończenia");
        setLoading(false);
        return;
      }

      if (isScheduled && !startDate) {
        toast.error("Wybierz datę rozpoczęcia dla zaplanowanej zbiórki");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("collections").insert({
        owner_id: user.id,
        title: formData.title,
        description: formData.description,
        goal_amount: parseInt(formData.goal_amount),
        category: formData.category,
        image_url: formData.image_url || null,
        start_date: isScheduled && startDate ? startDate.toISOString() : new Date().toISOString(),
        deadline: endCondition === "date" && endDate ? endDate.toISOString() : null,
        end_condition: endCondition,
        status: "active",
      });

      if (error) throw error;

      toast.success("Zbiórka utworzona!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Błąd tworzenia zbiórki");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar balance={balance} onBalanceUpdate={fetchBalance} />
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
                <Label htmlFor="goal_amount">Cel w kredytach *</Label>
                <Input
                  id="goal_amount"
                  type="number"
                  min="1"
                  value={formData.goal_amount}
                  onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
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

              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="scheduled"
                    checked={isScheduled}
                    onCheckedChange={(checked) => setIsScheduled(checked as boolean)}
                  />
                  <Label htmlFor="scheduled" className="cursor-pointer">
                    Zaplanuj zbiórkę (ustaw datę rozpoczęcia)
                  </Label>
                </div>

                {isScheduled && (
                  <div className="space-y-2 pl-6">
                    <Label>Data rozpoczęcia</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP", { locale: pl }) : "Wybierz datę"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="pointer-events-auto"
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4 border rounded-lg">
                <Label>Warunek zakończenia zbiórki *</Label>
                <RadioGroup value={endCondition} onValueChange={(value: any) => setEndCondition(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="date" />
                    <Label htmlFor="date" className="cursor-pointer">Do określonej daty</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="goal" id="goal" />
                    <Label htmlFor="goal" className="cursor-pointer">Do uzbierania celu</Label>
                  </div>
                </RadioGroup>

                {endCondition === "date" && (
                  <div className="space-y-2 pl-6">
                    <Label>Data zakończenia</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP", { locale: pl }) : "Wybierz datę"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="pointer-events-auto"
                          disabled={(date) => {
                            const minDate = isScheduled && startDate ? startDate : new Date();
                            return date < minDate;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">URL zdjęcia (opcjonalnie)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
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
