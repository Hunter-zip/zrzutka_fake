-- Create storage bucket for collection images
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection-images', 'collection-images', true);

-- Create storage policies for collection images
CREATE POLICY "Collection images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'collection-images');

CREATE POLICY "Authenticated users can upload collection images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collection-images');

CREATE POLICY "Users can update their own collection images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'collection-images');

CREATE POLICY "Users can delete their own collection images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'collection-images');

-- Create forum tables
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_categories
CREATE POLICY "Categories are viewable by everyone"
ON public.forum_categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can create categories"
ON public.forum_categories
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.forum_categories
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.forum_categories
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for forum_posts
CREATE POLICY "Posts are viewable by everyone"
ON public.forum_posts
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create posts"
ON public.forum_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON public.forum_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON public.forum_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any post"
ON public.forum_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for forum_replies
CREATE POLICY "Replies are viewable by everyone"
ON public.forum_replies
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create replies"
ON public.forum_replies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
ON public.forum_replies
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
ON public.forum_replies
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any reply"
ON public.forum_replies
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Insert default forum categories
INSERT INTO public.forum_categories (name, description) VALUES
('Ogólne', 'Dyskusje ogólne o platformie'),
('Pomoc', 'Pytania i odpowiedzi dotyczące zbiórek'),
('Sugestie', 'Pomysły i sugestie dotyczące platform');

-- Create trigger for updating forum_posts updated_at
CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();