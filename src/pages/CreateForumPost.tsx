import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  title: string;
}

const CreateForumPost = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [collectionId, setCollectionId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchCategories();
    fetchCollections();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Musisz być zalogowany");
      navigate("/auth");
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("forum_categories")
      .select("id, name")
      .order("name");

    if (error) {
      toast.error("Błąd pobierania kategorii");
      return;
    }

    setCategories(data || []);
  };

  const fetchCollections = async () => {
    const { data, error } = await supabase
      .from("collections")
      .select("id, title")
      .eq("status", "active")
      .order("title");

    if (error) {
      toast.error("Błąd pobierania zbiórek");
      return;
    }

    setCollections(data || []);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sesja wygasła");
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("forum_posts")
      .insert({
        title,
        content,
        category_id: categoryId || null,
        collection_id: collectionId || null,
        user_id: session.user.id,
      });

    setLoading(false);

    if (error) {
      toast.error("Błąd tworzenia posta");
      return;
    }

    toast.success("Post utworzony");
    navigate("/forum");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar showSearch={false} onSearch={() => {}} />
      
      <div className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/forum")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do forum
        </Button>

        <Card className="p-6">
          <h1 className="text-3xl font-bold mb-6">Nowy post na forum</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tytuł</label>
              <Input
                placeholder="Wprowadź tytuł posta"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Kategoria (opcjonalnie)</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Zbiórka (opcjonalnie)</label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz zbiórkę" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Treść</label>
              <Textarea
                placeholder="Napisz treść posta..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
              />
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/forum")}
                disabled={loading}
              >
                Anuluj
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Tworzenie..." : "Utwórz post"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreateForumPost;
