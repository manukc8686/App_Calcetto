import { useState } from "react";
import { StatsBar } from "@/components/StatsBar";
import { PlayerTable } from "@/components/PlayerTable";
import { AddPlayerForm } from "@/components/AddPlayerForm";

export default function Home() {
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());

  const toggleRole = (ruolo: string) => {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(ruolo)) {
        next.delete(ruolo);
      } else {
        next.add(ruolo);
      }
      return next;
    });
  };

  const clearFilter = () => setRoleFilter(new Set());

  return (
    <div className="space-y-8">
      <section>
        <StatsBar roleFilter={roleFilter} onToggleRole={toggleRole} onClearFilter={clearFilter} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Rosa Giocatori
              {roleFilter.size > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  — filtro: {Array.from(roleFilter).join(", ")}
                </span>
              )}
            </h2>
          </div>
          <PlayerTable roleFilter={roleFilter} />
        </div>

        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-28">
            <AddPlayerForm />
          </div>
        </div>
      </div>
    </div>
  );
}
