import { useState, useEffect, useMemo } from "react";
import { useListGiocatori, useGeneraSquadre } from "@workspace/api-client-react";
import { StarRating } from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Shield, User, Play, RotateCcw, Copy, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "calcetto_partecipanti_ids";
const STORAGE_KEY_SECONDA_PARTITA = "calcetto_seconda_partita_ids";

export default function Partite() {
  const { data: giocatori, isLoading } = useListGiocatori();
  const generaSquadreMutation = useGeneraSquadre();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [secondaPartitaIds, setSecondaPartitaIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SECONDA_PARTITA);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [teams, setTeams] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SECONDA_PARTITA, JSON.stringify(Array.from(secondaPartitaIds)));
  }, [secondaPartitaIds]);

  const togglePlayer = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSecondaPartita = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(secondaPartitaIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // Auto select if they are playing a second game
      if (!selectedIds.has(id)) {
        const nextSel = new Set(selectedIds);
        nextSel.add(id);
        setSelectedIds(nextSel);
      }
    }
    setSecondaPartitaIds(next);
  };

  const selectAll = () => {
    if (giocatori) {
      setSelectedIds(new Set(giocatori.map(g => g.id)));
    }
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setSecondaPartitaIds(new Set());
  };

  const filteredGiocatori = useMemo(() => {
    if (!giocatori) return [];
    if (!search) return giocatori;
    const s = search.toLowerCase();
    return giocatori.filter(g => g.nome.toLowerCase().includes(s));
  }, [giocatori, search]);

  const selectedGiocatori = useMemo(() => {
    if (!giocatori) return [];
    return giocatori.filter(g => selectedIds.has(g.id));
  }, [giocatori, selectedIds]);

  const numPortieri = selectedGiocatori.filter(g => g.ruolo === "Portiere").length;
  const numMovimento = selectedGiocatori.length - numPortieri;

  const handleGenerate = () => {
    if (selectedIds.size < 3) {
      toast({
        title: "Errore",
        description: "Seleziona almeno 3 giocatori per generare le squadre.",
        variant: "destructive"
      });
      return;
    }
    generaSquadreMutation.mutate({ 
      data: { 
        giocatoriIds: Array.from(selectedIds),
        secondaPartitaIds: Array.from(secondaPartitaIds)
      } 
    }, {
      onSuccess: (data) => {
        setTeams(data);
        toast({
          title: "Squadre generate",
          description: "Le squadre sono state bilanciate con successo."
        });
      },
      onError: () => {
        toast({
          title: "Errore",
          description: "Impossibile generare le squadre.",
          variant: "destructive"
        });
      }
    });
  };

  const copyToWhatsApp = () => {
    if (!teams) return;
    
    const formatTeam = (teamName: string, team: any) => {
      const players = team.giocatori.map((g: any) => g.virtuale ? `${g.nome} (Virtuale)` : g.nome).join(", ");
      return `⚽ *${team.nome || teamName}*: ${players}`;
    };

    const text = [
      teams.squadraA ? formatTeam("Squadra 1", teams.squadraA) : "",
      teams.squadraB ? formatTeam("Squadra 2", teams.squadraB) : "",
      teams.squadraC ? formatTeam("Squadra 3", teams.squadraC) : "",
    ].filter(Boolean).join("\n\n");

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiato",
        description: "Testo copiato per WhatsApp!"
      });
    }).catch(() => {
      toast({
        title: "Errore",
        description: "Impossibile copiare il testo.",
        variant: "destructive"
      });
    });
  };

  if (teams) {
    const teamsList = [
      teams.squadraA,
      teams.squadraB,
      teams.squadraC
    ].filter(Boolean);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Risultati Squadre</h2>
            <p className="text-muted-foreground">Squadre bilanciate in base al livello dei giocatori</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setTeams(null)} className="flex-1 sm:flex-none">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Modifica
            </Button>
            <Button variant="secondary" onClick={handleGenerate} disabled={generaSquadreMutation.isPending} className="flex-1 sm:flex-none">
              <RotateCcw className={cn("w-4 h-4 mr-2", generaSquadreMutation.isPending && "animate-spin")} />
              Rigenera
            </Button>
            <Button onClick={copyToWhatsApp} className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#128C7E] text-white">
              <Copy className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border text-center">
          Info: Livello = (Rating × 2) + (Vittorie / (Presenze + 1) × 5)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teamsList.map((team: any, idx: number) => (
            <Card key={idx} className="border-2 overflow-hidden shadow-md">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full shadow-sm",
                    idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-red-500" : "bg-green-500"
                  )} />
                  {team.nome || `Squadra ${idx + 1}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {team.giocatori.map((g: any, i: number) => (
                    <li key={i} className={cn("p-4 flex items-center justify-between hover:bg-muted/10 transition-colors", g.virtuale && "bg-muted/30 opacity-70 border-dashed")}>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-lg">{g.nome}</p>
                          <Badge variant="outline" className={cn(
                            "mt-1 font-medium text-xs",
                            g.ruolo === "Attaccante" && "border-red-200 text-red-700 bg-red-50",
                            g.ruolo === "Centrocampista" && "border-blue-200 text-blue-700 bg-blue-50",
                            g.ruolo === "Difensore" && "border-green-200 text-green-700 bg-green-50",
                            g.ruolo === "Portiere" && "border-yellow-200 text-yellow-700 bg-yellow-50"
                          )}>
                            {g.ruolo}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block font-medium">Livello: {g.livello?.toFixed(1) || g.forza?.toFixed(1)} | Vittorie: {g.vittorie || 0}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="bg-primary/5 border-t p-4 flex justify-between items-center">
                <span className="font-medium text-primary">Livello Totale</span>
                <span className="text-xl font-bold tabular-nums text-primary">
                  {team.livelloTotale?.toFixed(1) || team.forzaTotale?.toFixed(1)}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Selezione Partecipanti</h2>
          <p className="text-muted-foreground">Scegli i giocatori disponibili per la partita</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={selectAll} className="flex-1 sm:flex-none">
            Seleziona Tutti
          </Button>
          <Button variant="outline" onClick={deselectAll} className="flex-1 sm:flex-none">
            Deseleziona
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Cerca giocatore..." 
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 px-4 py-2 bg-white rounded-md border text-sm font-medium">
          <div className="flex items-center gap-1.5 text-primary">
            <Users className="w-4 h-4" />
            <span>Selezionati: {selectedIds.size}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-yellow-600">
            <Shield className="w-4 h-4" />
            <span>Portieri: {numPortieri}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-blue-600">
            <User className="w-4 h-4" />
            <span>Movimento: {numMovimento}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-24">
          {(["Portiere", "Difensore", "Centrocampista", "Attaccante"] as const).map((ruolo) => {
            const colPlayers = filteredGiocatori.filter(g => g.ruolo === ruolo);
            const colColors = {
              Portiere: { header: "bg-yellow-50 border-yellow-200 text-yellow-800", dot: "bg-yellow-500" },
              Difensore: { header: "bg-blue-50 border-blue-200 text-blue-800", dot: "bg-blue-500" },
              Centrocampista: { header: "bg-purple-50 border-purple-200 text-purple-800", dot: "bg-purple-500" },
              Attaccante: { header: "bg-red-50 border-red-200 text-red-800", dot: "bg-red-500" },
            }[ruolo];
            return (
              <div key={ruolo} className="flex flex-col gap-2">
                <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg border font-semibold text-sm", colColors.header)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", colColors.dot)} />
                    {ruolo === "Portiere" ? "Portieri" : ruolo === "Difensore" ? "Difensori" : ruolo === "Centrocampista" ? "Centrocampisti" : "Attaccanti"}
                  </div>
                  <span className="text-xs font-medium opacity-70">
                    {colPlayers.filter(g => selectedIds.has(g.id)).length}/{colPlayers.length}
                  </span>
                </div>
                {colPlayers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nessuno</p>
                )}
                {colPlayers.map((g) => {
                  const isSelected = selectedIds.has(g.id);
                  const isSecondaPartita = secondaPartitaIds.has(g.id);
                  return (
                    <Card
                      key={g.id}
                      className={cn(
                        "cursor-pointer transition-all overflow-hidden relative",
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/50"
                      )}
                      onClick={() => togglePlayer(g.id)}
                      data-testid={`player-card-${g.id}`}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePlayer(g.id)}
                          className="w-5 h-5 rounded-md pointer-events-none mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm leading-tight">{g.nome}</p>
                          <StarRating rating={g.rating} readOnly />
                          <div className="mt-2 flex items-center gap-1.5" onClick={(e) => toggleSecondaPartita(g.id, e)}>
                            <Checkbox
                              checked={isSecondaPartita}
                              onCheckedChange={() => {}}
                              className="w-3.5 h-3.5 rounded-sm border-muted-foreground/50 pointer-events-none"
                              id={`seconda-partita-${g.id}`}
                            />
                            <label htmlFor={`seconda-partita-${g.id}`} className="text-[11px] text-muted-foreground cursor-pointer font-medium">
                              2a Partita
                            </label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-20 flex justify-center">
        <Button 
          size="lg" 
          className="w-full max-w-md shadow-lg font-bold text-lg h-14"
          disabled={selectedIds.size < 3 || generaSquadreMutation.isPending}
          onClick={handleGenerate}
          data-testid="btn-genera-squadre"
        >
          <Play className="w-5 h-5 mr-2" />
          Genera Squadre {selectedIds.size > 0 && `(${selectedIds.size})`}
        </Button>
      </div>
    </div>
  );
}
