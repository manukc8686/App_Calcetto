import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateGiocatore, getListGiocatoriQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "./StarRating";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  nome: z.string().min(1, "Il nome è obbligatorio"),
  ruolo: z.enum(["Attaccante", "Difensore", "Centrocampista", "Portiere"]),
  rating: z.number().int().min(1).max(5),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  player: { id: number; nome: string; ruolo: string; rating: number } | null;
  onClose: () => void;
}

export function EditPlayerModal({ player, onClose }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updatePlayer = useUpdateGiocatore();
  const [hoverRating, setHoverRating] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: player?.nome ?? "",
      ruolo: (player?.ruolo as FormValues["ruolo"]) ?? "Attaccante",
      rating: player?.rating ?? 3,
    },
  });

  useEffect(() => {
    if (player) {
      form.reset({
        nome: player.nome,
        ruolo: player.ruolo as FormValues["ruolo"],
        rating: player.rating,
      });
    }
  }, [player, form]);

  const onSubmit = (values: FormValues) => {
    if (!player) return;
    updatePlayer.mutate(
      { id: player.id, data: values },
      {
        onSuccess: () => {
          toast({ title: "Salvato", description: `${values.nome} aggiornato.` });
          queryClient.invalidateQueries({ queryKey: getListGiocatoriQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          onClose();
        },
        onError: () => {
          toast({ title: "Errore", description: "Impossibile salvare le modifiche.", variant: "destructive" });
        },
      }
    );
  };

  const currentRating = form.watch("rating");

  return (
    <Dialog open={!!player} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-edit-player">
        <DialogHeader>
          <DialogTitle>Modifica Giocatore</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-nome" placeholder="Es. Totti" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ruolo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-ruolo">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Attaccante">Attaccante</SelectItem>
                      <SelectItem value="Difensore">Difensore</SelectItem>
                      <SelectItem value="Centrocampista">Centrocampista</SelectItem>
                      <SelectItem value="Portiere">Portiere</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex gap-1" data-testid="rating-edit-selector">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                          onClick={() => field.onChange(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          data-testid={`star-edit-${star}`}
                        >
                          <span className={(hoverRating || currentRating) >= star ? "text-yellow-400" : "text-gray-300"}>
                            ★
                          </span>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="btn-cancel-edit">
                Annulla
              </Button>
              <Button type="submit" disabled={updatePlayer.isPending} data-testid="btn-save-edit">
                {updatePlayer.isPending ? "Salvataggio..." : "Salva Modifiche"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
