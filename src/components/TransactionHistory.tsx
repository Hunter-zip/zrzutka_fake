import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Błąd pobierania historii:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historia transakcji
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Brak transakcji
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {transaction.type === "deposit" ? (
                    <div className="p-2 rounded-full bg-primary/10">
                      <ArrowDownLeft className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-destructive/10">
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), "dd MMM yyyy, HH:mm", { locale: pl })}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    transaction.type === "deposit"
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {transaction.type === "deposit" ? "+" : "-"}
                  {transaction.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
