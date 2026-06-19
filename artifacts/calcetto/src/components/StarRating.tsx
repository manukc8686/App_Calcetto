import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
}

export function StarRating({ rating, maxRating = 5, onChange, readOnly = true }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;
        return (
          <Star
            key={i}
            className={cn(
              "h-5 w-5 transition-colors",
              isFilled ? "fill-accent text-accent" : "fill-muted text-muted-foreground/30",
              !readOnly && "cursor-pointer hover:scale-110 active:scale-95"
            )}
            onClick={() => !readOnly && onChange?.(starValue)}
            data-testid={`star-${starValue}`}
          />
        );
      })}
    </div>
  );
}
