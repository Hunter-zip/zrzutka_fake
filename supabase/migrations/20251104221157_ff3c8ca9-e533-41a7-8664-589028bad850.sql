-- Add likes table for collections
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, collection_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" 
ON public.likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create likes" 
ON public.likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" 
ON public.likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add likes_count to collections
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Add start_date to collections (for scheduled collections)
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add end_condition to collections ('date' or 'goal')
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS end_condition TEXT NOT NULL DEFAULT 'date';

-- Create transactions table for credit history
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'contribution', 'refund'
  description TEXT,
  collection_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);