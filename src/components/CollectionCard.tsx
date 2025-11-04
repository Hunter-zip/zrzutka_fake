import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Coins, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface CollectionCardProps {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  category: string;
  deadline?: string;
  imageUrl?: string;
}

const CollectionCard = ({
  id,
  title,
  description,
  goalAmount,
  currentAmount,
  category,
  deadline,
  imageUrl,
}: CollectionCardProps) => {
  const progress = (currentAmount / goalAmount) * 100;

  return (
    <Link to={`/collection/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        {imageUrl && (
          <div className="aspect-video overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary">{category}</Badge>
            {deadline && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(deadline), { addSuffix: true, locale: pl })}
              </div>
            )}
          </div>
          <CardTitle className="line-clamp-2">{title}</CardTitle>
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-bold text-lg text-primary">{currentAmount}</span>
              <span className="text-muted-foreground text-sm">/ {goalAmount}</span>
            </div>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CollectionCard;