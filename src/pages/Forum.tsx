import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  category_id: string | null;
  profiles: {
    display_name: string;
  };
  replies_count?: number;
}

const Forum = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    fetchCategories();
    fetchPosts();
  }, [selectedCategory]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("forum_categories")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Błąd pobierania kategorii");
      return;
    }

    setCategories(data || []);
  };

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Błąd pobierania postów");
      setLoading(false);
      return;
    }

    // Fetch profiles and reply counts for each post
    const postsWithData = await Promise.all(
      (data || []).map(async (post) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", post.user_id)
          .single();

        const { count } = await supabase
          .from("forum_replies")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id);
        
        return { 
          ...post, 
          profiles: profile || { display_name: "Nieznany" },
          replies_count: count || 0 
        };
      })
    );

    setPosts(postsWithData);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar showSearch={false} onSearch={() => {}} />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Forum</h1>
          {user && (
            <Button onClick={() => navigate("/forum/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Nowy post
            </Button>
          )}
        </div>

        {/* Categories */}
        <div className="mb-8 flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
          >
            Wszystkie
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Ładowanie...</p>
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Brak postów w tej kategorii</p>
            </Card>
          ) : (
            posts.map((post) => (
              <Card
                key={post.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/forum/${post.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 mb-4">{post.content}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Autor: {post.profiles?.display_name || "Nieznany"}</span>
                      <span>•</span>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.replies_count || 0}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Forum;
