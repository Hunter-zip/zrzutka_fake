-- Add collection_id to forum_posts table
ALTER TABLE public.forum_posts 
ADD COLUMN collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL;