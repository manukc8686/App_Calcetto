import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateGiocatore, getListGiocatoriQueryKey, getGetStatsQueryKey, GiocatoreInputRuolo } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StarRating } from "./StarRating";
import { UserPlus, Loader2 } from "lucide-react";

const formSchema = z.object({
  nome: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  ruolo: z.nativeEnum(GiocatoreInputRuolo, { required_error: "Seleziona un ruolo" }),
  rating: z.number().min(1).max(5),
});

type FormValues = z.infer<typeof formSchema>;

export function AddPlayerForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createPlayer = useCreateGiocatore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      ruolo: undefined,
      rating: 3,
    },
  });

  const onSubmit = (data: FormValues) => {
    createPlayer.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Giocatore aggiunto",
            description: `${data.nome} è stato aggiunto alla rosa!`,
          });
          form.reset({ nome: "", ruolo: undefined as any, rating: 3 });
          queryClient.invalidateQueries({ queryKey: getListGiocatoriQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.error || error?.message || "Errore nel salvataggio";
          toast({
            title: "Errore",
            description: errorMessage,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Aggiungi Giocatore
        </CardTitle>
        <CardDescription>Inserisci un nuovo talento in rosa</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. Totti" {...field} data-testid="input-nome" />
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ruolo">
                        <SelectValue placeholder="Seleziona ruolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={GiocatoreInputRuolo.Attaccante}>Attaccante</SelectItem>
                      <SelectItem value={GiocatoreInputRuolo.Centrocampista}>Centrocampista</SelectItem>
                      <SelectItem value={GiocatoreInputRuolo.Difensore}>Difensore</SelectItem>
                      <SelectItem value={GiocatoreInputRuolo.Portiere}>Portiere</SelectItem>
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
                    <div className="py-2">
                      <StarRating
                        rating={field.value}
                        onChange={field.onChange}
                        readOnly={false}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={createPlayer.isPending}
              data-testid="button-submit-player"
            >
              {createPlayer.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aggiungendo...
                </>
              ) : (
                "Aggiungi alla Rosa"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
