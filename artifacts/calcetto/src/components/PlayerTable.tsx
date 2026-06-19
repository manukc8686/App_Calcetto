import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGiocatori,
  useIncrementPresenze,
  useDecrementPresenze,
  useIncrementVittorie,
  useDecrementVittorie,
  useDeleteGiocatore,
  useBulkDeleteGiocatori,
  useResetStats,
  getListGiocatoriQueryKey,
  getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "./StarRating";
import { PlayerDetailModal } from "./PlayerDetailModal";
import { EditPlayerModal } from "./EditPlayerModal";
import { Plus, Minus, Trophy, Trash2, Pencil, RotateCcw, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Player = {
  id: number;
  nome: string;
  ruolo: "Attaccante" | "Difensore" | "Centrocampista" | "Portiere";
  rating: number;
  presenze: number;
  vittorie: number;
};

type SortField = "nome" | "ruolo" | "rating" | "presenze" | "vittorie";
type SortOrder = "asc" | "desc";

interface PlayerTableProps {
  roleFilter?: Set<string>;
}

export function PlayerTable({ roleFilter }: PlayerTableProps = {}) {
  const { data: players, isLoading } = useListGiocatori();
  const incPresenze = useIncrementPresenze();
  const decPresenze = useDecrementPresenze();
  const incVittorie = useIncrementVittorie();
  const decVittorie = useDecrementVittorie();
  const deletePlayer = useDeleteGiocatore();
  const bulkDeleteGiocatori = useBulkDeleteGiocatori();
  const resetStats = useResetStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>("rating");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListGiocatoriQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
  };

  const sortedPlayers = useMemo(() => {
    if (!players) return [];
    const filtered = roleFilter && roleFilter.size > 0
      ? players.filter((p) => roleFilter.has(p.ruolo))
      : players;
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [players, sortField, sortOrder, roleFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "nome" || field === "ruolo" ? "asc" : "desc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-30" />;
    return sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  const toggleSelectAll = () => {
    if (!players) return;
    if (selectedPlayerIds.size === players.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(players.map((p) => p.id)));
    }
  };

  const toggleSelectPlayer = (id: number) => {
    const newSelected = new Set(selectedPlayerIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPlayerIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (confirm(`Sei sicuro di voler eliminare i ${selectedPlayerIds.size} giocatori selezionati?`)) {
      bulkDeleteGiocatori.mutate(
        { data: { ids: Array.from(selectedPlayerIds) } },
        {
          onSuccess: () => {
            toast({ title: "Eliminati", description: "I giocatori selezionati sono stati rimossi." });
            setSelectedPlayerIds(new Set());
            invalidate();
          },
        }
      );
    }
  };

  const handleBulkReset = async () => {
    const idsToReset = selectedPlayerIds.size > 0
      ? Array.from(selectedPlayerIds)
      : (players ?? []).map((p) => p.id);
    const label = selectedPlayerIds.size > 0
      ? `${selectedPlayerIds.size} giocator${selectedPlayerIds.size === 1 ? "e" : "i"} selezionat${selectedPlayerIds.size === 1 ? "o" : "i"}`
      : "tutti i giocatori";
    if (!confirm(`Sei sicuro di voler azzerare le statistiche di ${label}?`)) return;
    try {
      await Promise.all(idsToReset.map((id) => resetStats.mutateAsync({ id })));
      toast({ title: "Statistiche azzerate", description: `Azzerate per ${label}.` });
      setSelectedPlayerIds(new Set());
      invalidate();
    } catch {
      toast({ title: "Errore", description: "Impossibile azzerare le statistiche.", variant: "destructive" });
    }
  };

  const onIncPresenze = (id: number, nome: string) => {
    incPresenze.mutate({ id }, { onSuccess: () => { toast({ title: "Aggiornato", description: `+1 Presenza per ${nome}` }); invalidate(); } });
  };
  const onDecPresenze = (id: number, nome: string, presenze: number) => {
    if (presenze <= 0) return;
    decPresenze.mutate({ id }, { onSuccess: () => { toast({ title: "Aggiornato", description: `-1 Presenza per ${nome}` }); invalidate(); } });
  };

  const onIncVittorie = (id: number, nome: string) => {
    incVittorie.mutate({ id }, { onSuccess: () => { toast({ title: "Aggiornato", description: `+1 Vittoria per ${nome}` }); invalidate(); } });
  };
  const onDecVittorie = (id: number, nome: string, vittorie: number) => {
    if (vittorie <= 0) return;
    decVittorie.mutate({ id }, { onSuccess: () => { toast({ title: "Aggiornato", description: `-1 Vittoria per ${nome}` }); invalidate(); } });
  };

  const onDelete = (id: number, nome: string) => {
    if (confirm(`Sei sicuro di voler eliminare ${nome}?`)) {
      deletePlayer.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Eliminato", description: `${nome} è stato rimosso dalla rosa.` });
          invalidate();
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed text-muted-foreground">
        <p>Nessun giocatore in rosa.</p>
        <p className="text-sm mt-1">Aggiungi il primo campione!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {selectedPlayerIds.size > 0
              ? `${selectedPlayerIds.size} ${selectedPlayerIds.size === 1 ? "giocatore selezionato" : "giocatori selezionati"}`
              : ""}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkReset}
              disabled={resetStats.isPending}
              data-testid="btn-bulk-reset"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {selectedPlayerIds.size > 0
                ? `Azzera Selezionati (${selectedPlayerIds.size})`
                : "Azzera Tutti"}
            </Button>
            {selectedPlayerIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleteGiocatori.isPending}
                data-testid="btn-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina Selezionati ({selectedPlayerIds.size})
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40px] text-center">
                  <Checkbox
                    checked={sortedPlayers.length > 0 && selectedPlayerIds.size === sortedPlayers.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleziona tutti"
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead className="w-[180px] cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("nome")}>
                  Nome {renderSortIcon("nome")}
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("ruolo")}>
                  Ruolo {renderSortIcon("ruolo")}
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("rating")}>
                  Rating {renderSortIcon("rating")}
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("presenze")}>
                  Presenze {renderSortIcon("presenze")}
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("vittorie")}>
                  Vittorie {renderSortIcon("vittorie")}
                </TableHead>
                <TableHead className="text-center hidden lg:table-cell">Livello</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((p) => (
                <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors" data-testid={`row-player-${p.id}`}>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedPlayerIds.has(p.id)}
                      onCheckedChange={() => toggleSelectPlayer(p.id)}
                      aria-label={`Seleziona ${p.nome}`}
                      data-testid={`checkbox-select-${p.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-base">{p.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "font-medium",
                      p.ruolo === "Attaccante" && "border-red-200 text-red-700 bg-red-50",
                      p.ruolo === "Centrocampista" && "border-blue-200 text-blue-700 bg-blue-50",
                      p.ruolo === "Difensore" && "border-green-200 text-green-700 bg-green-50",
                      p.ruolo === "Portiere" && "border-yellow-200 text-yellow-700 bg-yellow-50"
                    )}>
                      {p.ruolo}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StarRating rating={p.rating} />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={() => onDecPresenze(p.id, p.nome, p.presenze)}
                        disabled={p.presenze <= 0}
                        data-testid={`btn-dec-presenze-${p.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-lg font-bold w-7 text-center tabular-nums">{p.presenze}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                        onClick={() => onIncPresenze(p.id, p.nome)}
                        data-testid={`btn-inc-presenze-${p.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={() => onDecVittorie(p.id, p.nome, p.vittorie)}
                        disabled={p.vittorie <= 0}
                        data-testid={`btn-dec-vittorie-${p.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-lg font-bold w-7 text-center tabular-nums">{p.vittorie}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-secondary hover:bg-secondary/10 rounded-full"
                        onClick={() => onIncVittorie(p.id, p.nome)}
                        data-testid={`btn-inc-vittorie-${p.id}`}
                      >
                        <Trophy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    <span className="font-semibold tabular-nums text-sm text-primary">
                      {((p.rating * 2.0) + ((p.vittorie / (p.presenze + 1)) * 5.0)).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => setEditingPlayer(p as Player)}
                      title="Modifica"
                      data-testid={`btn-edit-${p.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(p.id, p.nome)}
                      title="Elimina"
                      data-testid={`btn-delete-${p.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <PlayerDetailModal
        playerId={selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
      />
      <EditPlayerModal
        player={editingPlayer}
        onClose={() => setEditingPlayer(null)}
      />
    </>
  );
}
