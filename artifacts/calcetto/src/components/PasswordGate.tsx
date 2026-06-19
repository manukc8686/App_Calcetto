import { useState, useEffect } from "react";
import { Dribbble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (localStorage.getItem("calcetto_auth") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "CalcettoEstivo") {
      localStorage.setItem("calcetto_auth", "true");
      setIsAuthenticated(true);
    } else {
      setError("Password errata");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center">
            <Dribbble className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">
            Torneo Calcetto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Inserisci la password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                data-testid="input-password"
              />
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            </div>
            <Button type="submit" className="w-full font-bold" data-testid="btn-login">
              Entra
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
