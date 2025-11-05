import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  collection_id: string | null;
  profiles: {
    display_name: string;
  };
  collection?: {
    title: string;
  };
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string;
  };
}

const ForumPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPost();
    fetchReplies();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    
    if (session?.user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();
      
      setIsAdmin(!!data);
    }
  };

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Błąd pobierania posta");
      navigate("/forum");
      return;
    }

    // Fetch profile separately
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", data.user_id)
      .single();

    // Fetch collection if it exists
    let collection = null;
    if (data.collection_id) {
      const { data: collectionData } = await supabase
        .from("collections")
        .select("title")
        .eq("id", data.collection_id)
        .single();
      
      collection = collectionData;
    }

    setPost({ 
      ...data, 
      profiles: profile || { display_name: "Nieznany" },
      collection: collection || undefined
    });
    setLoading(false);
  };

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from("forum_replies")
      .select("*")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Błąd pobierania odpowiedzi");
      return;
    }

    // Fetch profiles for each reply
    const repliesWithProfiles = await Promise.all(
      (data || []).map(async (reply) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", reply.user_id)
          .single();

        return {
          ...reply,
          profiles: profile || { display_name: "Nieznany" }
        };
      })
    );

    setReplies(repliesWithProfiles);
  };

  const handleSubmitReply = async () => {
    if (!user) {
      toast.error("Musisz być zalogowany aby odpowiedzieć");
      navigate("/auth");
      return;
    }

    if (!newReply.trim()) {
      toast.error("Treść odpowiedzi nie może być pusta");
      return;
    }

    const { error } = await supabase
      .from("forum_replies")
      .insert({
        post_id: id,
        user_id: user.id,
        content: newReply,
      });

    if (error) {
      toast.error("Błąd dodawania odpowiedzi");
      return;
    }

    toast.success("Odpowiedź dodana");
    setNewReply("");
    fetchReplies();
  };

  const handleDeleteReply = async (replyId: string) => {
    const { error } = await supabase
      .from("forum_replies")
      .delete()
      .eq("id", replyId);

    if (error) {
      toast.error("Błąd usuwania odpowiedzi");
      return;
    }

    toast.success("Odpowiedź usunięta");
    fetchReplies();
  };

  const handleDeletePost = async () => {
    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Błąd usuwania posta");
      return;
    }

    toast.success("Post usunięty");
    navigate("/forum");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar showSearch={false} onSearch={() => {}} />
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar showSearch={false} onSearch={() => {}} />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate("/forum")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do forum
        </Button>

        {/* Post */}
        <Card className="p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
              {post.collection && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Dotyczy zbiórki:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/collection/${post.collection_id}`);
                    }}
                  >
                    {post.collection.title}
                  </Button>
                </div>
              )}
            </div>
            {(user?.id === post.user_id || isAdmin) && (
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDeletePost}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Autor: {post.profiles?.display_name || "Nieznany"}</span>
            <span>•</span>
            <span>{formatDate(post.created_at)}</span>
          </div>
        </Card>

        {/* Replies */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Odpowiedzi ({replies.length})</h2>
          <div className="space-y-4">
            {replies.map((reply) => (
              <Card key={reply.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="mb-2 whitespace-pre-wrap">{reply.content}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{reply.profiles?.display_name || "Nieznany"}</span>
                      <span>•</span>
                      <span>{formatDate(reply.created_at)}</span>
                    </div>
                  </div>
                  {(user?.id === reply.user_id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteReply(reply.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* New Reply Form */}
        {user ? (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Dodaj odpowiedź</h3>
            <Textarea
              placeholder="Napisz swoją odpowiedź..."
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              className="mb-4"
              rows={5}
            />
            <Button onClick={handleSubmitReply}>Dodaj odpowiedź</Button>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Musisz być zalogowany aby dodać odpowiedź
            </p>
            <Button onClick={() => navigate("/auth")}>Zaloguj się</Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ForumPost;
