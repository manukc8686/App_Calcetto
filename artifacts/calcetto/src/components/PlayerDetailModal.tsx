import React, { useState } from "react";
import { useGetGiocatore, getGetGiocatoreQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "./StarRating";
import { Trophy, Goal, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerDetailModalProps {
  playerId: number | null;
  onClose: () => void;
}

export function PlayerDetailModal({ playerId, onClose }: PlayerDetailModalProps) {
  const { data: player, isLoading } = useGetGiocatore(playerId as number, {
    query: {
      enabled: !!playerId,
      queryKey: getGetGiocatoreQueryKey(playerId as number),
    }
  });

  return (
    <Dialog open={!!playerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dettaglio Giocatore</DialogTitle>
          <DialogDescription>
            Informazioni complete della carriera
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : player ? (
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold font-sans tracking-tight">{player.nome}</h3>
                <Badge variant="outline" className={cn(
                  "mt-2 font-medium",
                  player.ruolo === "Attaccante" && "border-red-200 text-red-700 bg-red-50",
                  player.ruolo === "Centrocampista" && "border-blue-200 text-blue-700 bg-blue-50",
                  player.ruolo === "Difensore" && "border-green-200 text-green-700 bg-green-50",
                  player.ruolo === "Portiere" && "border-yellow-200 text-yellow-700 bg-yellow-50"
                )}>
                  {player.ruolo}
                </Badge>
              </div>
              <div className="bg-muted p-2 rounded-lg text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Rating</div>
                <StarRating rating={player.rating} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex flex-col items-center justify-center">
                <Activity className="h-6 w-6 text-accent mb-2" />
                <span className="text-3xl font-bold">{player.presenze}</span>
                <span className="text-sm font-medium text-muted-foreground">Presenze</span>
              </div>
              
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col items-center justify-center">
                <Trophy className="h-6 w-6 text-primary mb-2" />
                <span className="text-3xl font-bold">{player.vittorie}</span>
                <span className="text-sm font-medium text-muted-foreground">Vittorie</span>
              </div>
            </div>

            {player.presenze > 0 && (
              <div className="bg-muted rounded-xl p-4 text-center">
                <div className="text-sm font-medium text-muted-foreground mb-1">Percentuale Vittorie</div>
                <div className="text-xl font-bold text-foreground">
                  {Math.round((player.vittorie / player.presenze) * 100)}%
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
