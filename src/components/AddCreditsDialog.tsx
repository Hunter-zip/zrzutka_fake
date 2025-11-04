import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Wallet, Coins } from "lucide-react";

interface AddCreditsDialogProps {
  onCreditsAdded: () => void;
}

const AddCreditsDialog = ({ onCreditsAdded }: AddCreditsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) {
      toast.error("Wprowadź poprawną kwotę");
      return;
    }

    setLoading(true);

    try {
      // Symulacja procesu płatności
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nie jesteś zalogowany");

      // Dodaj kredyty do portfela
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (walletError) throw walletError;

      const newBalance = wallet.balance + parseInt(amount);
      
      const { error: updateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Dodaj transakcję
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: parseInt(amount),
          type: "deposit",
          description: `Wpłata ${paymentMethod === "card" ? "kartą" : paymentMethod === "blik" ? "BLIK" : "przelewem"}`,
        });

      if (transactionError) throw transactionError;

      toast.success(`Dodano ${amount} kredytów!`);
      setAmount("");
      setOpen(false);
      onCreditsAdded();
    } catch (error: any) {
      toast.error(error.message || "Błąd podczas dodawania kredytów");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Coins className="h-4 w-4" />
          Doładuj konto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Doładuj kredyty</DialogTitle>
          <DialogDescription>
            Wybierz kwotę i metodę płatności (symulacja)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Kwota kredytów</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Metoda płatności (wirtualna)</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer w-full">
                  <CreditCard className="h-4 w-4" />
                  Karta płatnicza
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="blik" id="blik" />
                <Label htmlFor="blik" className="flex items-center gap-2 cursor-pointer w-full">
                  <Wallet className="h-4 w-4" />
                  BLIK
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer w-full">
                  <Coins className="h-4 w-4" />
                  Przelew bankowy
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Przetwarzanie płatności..." : `Zapłać ${amount || "0"} kredytów`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditsDialog;
