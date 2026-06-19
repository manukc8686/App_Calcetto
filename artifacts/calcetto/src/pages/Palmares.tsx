import { useMemo } from "react";
import { useListGiocatori } from "@workspace/api-client-react";
import { Trophy, Medal, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Palmares() {
  const { data: giocatori, isLoading } = useListGiocatori();

  const palmaresData = useMemo(() => {
    if (!giocatori) return [];
    
    // Filter players with > 0 vittorie
    const winners = giocatori.filter((g) => g.vittorie > 0);
    
    // Group by vittorie
    const grouped = winners.reduce((acc, player) => {
      const v = player.vittorie;
      if (!acc[v]) acc[v] = [];
      acc[v].push(player);
      return acc;
    }, {} as Record<number, typeof giocatori>);

    // Sort groups descending
    const sortedGroups = Object.entries(grouped)
      .map(([vittorie, players]) => ({
        vittorie: Number(vittorie),
        // Sort players within group by name for consistency
        players: players.sort((a, b) => a.nome.localeCompare(b.nome))
      }))
      .sort((a, b) => b.vittorie - a.vittorie);

    return sortedGroups;
  }, [giocatori]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-8">
          <Skeleton className="h-12 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-100 rounded-full mb-2">
          <Trophy className="h-8 w-8 text-yellow-600" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Palmarès</h1>
        <p className="text-lg text-muted-foreground">
          Classifica dei giocatori con il maggior numero di vittorie nel torneo.
        </p>
      </div>

      {palmaresData.length === 0 ? (
        <Card className="max-w-md mx-auto border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nessuna vittoria registrata ancora</h3>
            <p className="text-muted-foreground text-sm">
              Gioca le prime partite per popolare la classifica.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {palmaresData.map((group, groupIndex) => {
            // Top 3 distinct victory amounts get special highlighting
            const isFirst = groupIndex === 0;
            const isSecond = groupIndex === 1;
            const isThird = groupIndex === 2;
            
            return (
              <section key={group.vittorie} className="space-y-4 relative">
                <div className="flex items-center gap-3 border-b pb-2">
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-lg border",
                    isFirst ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                    isSecond ? "bg-gray-100 text-gray-800 border-gray-200" :
                    isThird ? "bg-amber-100/50 text-amber-800 border-amber-200" :
                    "bg-muted text-muted-foreground border-transparent"
                  )}>
                    {isFirst && <Medal className="h-5 w-5" />}
                    {isSecond && <Medal className="h-5 w-5 opacity-80" />}
                    {isThird && <Medal className="h-5 w-5 opacity-70" />}
                    <span>{group.vittorie} Vittori{group.vittorie === 1 ? 'a' : 'e'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.players.map((player) => (
                    <Card key={player.id} className={cn(
                      "overflow-hidden transition-all hover-elevate",
                      isFirst && "border-yellow-200 shadow-sm",
                      isSecond && "border-gray-200 shadow-sm"
                    )}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                            isFirst ? "bg-yellow-500 text-white" :
                            isSecond ? "bg-gray-400 text-white" :
                            isThird ? "bg-amber-600/80 text-white" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {player.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-lg leading-tight">{player.nome}</p>
                            <Badge variant="outline" className={cn(
                              "mt-1 font-medium text-[10px] px-1.5 py-0",
                              player.ruolo === "Attaccante" && "border-red-200 text-red-700 bg-red-50",
                              player.ruolo === "Centrocampista" && "border-blue-200 text-blue-700 bg-blue-50",
                              player.ruolo === "Difensore" && "border-green-200 text-green-700 bg-green-50",
                              player.ruolo === "Portiere" && "border-yellow-200 text-yellow-700 bg-yellow-50"
                            )}>
                              {player.ruolo}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
