import { useMemo } from "react";
import { Users, Shield, Sword, Activity, Medal, Hand } from "lucide-react";
import { useListGiocatori } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatsBarProps {
  roleFilter: Set<string>;
  onToggleRole: (ruolo: string) => void;
  onClearFilter: () => void;
}

export function StatsBar({ roleFilter, onToggleRole, onClearFilter }: StatsBarProps) {
  const { data: players, isLoading } = useListGiocatori();

  const stats = useMemo(() => {
    if (!players) return null;
    const count = (ruolo: string) => players.filter((p) => p.ruolo === ruolo).length;
    const podio = [...players]
      .filter((p) => p.vittorie > 0)
      .sort((a, b) => b.vittorie - a.vittorie)
      .slice(0, 3);
    return {
      totale: players.length,
      portieri: count("Portiere"),
      difensori: count("Difensore"),
      centrocampisti: count("Centrocampista"),
      attaccanti: count("Attaccante"),
      podio,
    };
  }, [players]);

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="grid grid-cols-5 gap-3 flex-1">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-20 w-full lg:w-72 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const countItems = [
    {
      label: "Giocatori",
      value: stats.totale,
      icon: <Users className="h-4 w-4" />,
      color: "text-primary",
      ruolo: null,
    },
    {
      label: "Portieri",
      value: stats.portieri,
      icon: <Hand className="h-4 w-4" />,
      color: "text-yellow-600",
      ruolo: "Portiere",
    },
    {
      label: "Difensori",
      value: stats.difensori,
      icon: <Shield className="h-4 w-4" />,
      color: "text-blue-600",
      ruolo: "Difensore",
    },
    {
      label: "Centrocampisti",
      value: stats.centrocampisti,
      icon: <Activity className="h-4 w-4" />,
      color: "text-purple-600",
      ruolo: "Centrocampista",
    },
    {
      label: "Attaccanti",
      value: stats.attaccanti,
      icon: <Sword className="h-4 w-4" />,
      color: "text-red-600",
      ruolo: "Attaccante",
    },
  ];

  const podioColors = ["text-yellow-500", "text-slate-400", "text-amber-700"];
  const podioLabels = ["1°", "2°", "3°"];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="grid grid-cols-5 gap-3 flex-1">
        {countItems.map((item) => {
          const isActive = item.ruolo ? roleFilter.has(item.ruolo) : false;
          const isReset = item.ruolo === null;
          return (
            <Card
              key={item.label}
              onClick={() => (isReset ? onClearFilter() : onToggleRole(item.ruolo!))}
              className={cn(
                "border-border cursor-pointer transition-all select-none",
                isActive && "ring-2 ring-primary border-primary bg-primary/5",
                !isActive && !isReset && "hover:border-primary/40 hover:bg-muted/40",
                isReset && roleFilter.size > 0 && "hover:border-primary/40 hover:bg-muted/40",
                isReset && roleFilter.size === 0 && "opacity-70 cursor-default"
              )}
              data-testid={`filter-${item.label.toLowerCase()}`}
            >
              <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center gap-1 text-center">
                <span className={cn("opacity-70", item.color)}>{item.icon}</span>
                <span className="text-2xl font-bold tabular-nums">{item.value}</span>
                <span className="text-xs text-muted-foreground font-medium leading-tight">{item.label}</span>
                {isActive && (
                  <span className="text-[10px] text-primary font-semibold">attivo</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border lg:w-80">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Medal className="h-4 w-4 text-yellow-500" />
            Podio Vittorie
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {stats.podio.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna vittoria registrata</p>
          ) : (
            <ol className="space-y-1.5">
              {stats.podio.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold w-6 shrink-0", podioColors[i])}>
                      {podioLabels[i]}
                    </span>
                    <span className="font-semibold text-sm truncate">{p.nome}</span>
                  </div>
                  <Badge variant="secondary" className="tabular-nums shrink-0">
                    {p.vittorie} vitt.
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
