import { Link, useLocation } from "wouter";
import { Dribbble, Users, PlaySquare, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const getSubtitle = () => {
    if (location === "/partite") return "Generazione Squadre";
    if (location === "/palmares") return "Palmarès";
    return "Gestione Rosa e Statistiche";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-6 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Dribbble className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Torneo Calcetto</h1>
                <p className="text-primary-foreground/80 text-sm font-medium">
                  {getSubtitle()}
                </p>
              </div>
            </div>
            
            <nav className="flex items-center gap-1 sm:gap-2 bg-primary-foreground/10 p-1 rounded-lg self-start md:self-auto overflow-x-auto">
              <Link 
                href="/" 
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap",
                  location === "/" ? "bg-white text-primary shadow-sm" : "text-primary-foreground hover:bg-white/20"
                )}
                data-testid="nav-rosa"
              >
                <Users className="h-4 w-4" />
                Rosa
              </Link>
              <Link 
                href="/partite" 
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap",
                  location === "/partite" ? "bg-white text-primary shadow-sm" : "text-primary-foreground hover:bg-white/20"
                )}
                data-testid="nav-partite"
              >
                <PlaySquare className="h-4 w-4" />
                Genera Squadre
              </Link>
              <Link 
                href="/palmares" 
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap",
                  location === "/palmares" ? "bg-white text-primary shadow-sm" : "text-primary-foreground hover:bg-white/20"
                )}
                data-testid="nav-palmares"
              >
                <Trophy className="h-4 w-4" />
                Palmarès
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>
    </div>
  );
}
