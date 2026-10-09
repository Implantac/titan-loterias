import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Zap, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// Only accept same-origin relative paths as post-login redirect targets.
function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }

      // Check if session exists (standard login)
      if (data?.session) {
        toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
        
        // Use a slight delay to allow AuthProvider to hydrate state if needed,
        // but replace history so user cannot go back to login
        setTimeout(() => {
          navigate(nextPath, { replace: true });
        }, 100);
      }

    } catch (error: any) {
      console.error("Login error:", error);
      toast({ 
        title: "Erro ao entrar", 
        description: error.message || "Verifique suas credenciais.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };




  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-blue/5 rounded-full blur-3xl" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="shadow-premium">
          <CardHeader className="text-center space-y-4 pb-2">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto overflow-hidden bg-card border border-primary/20 shadow-gold">
                <img src="/logo.png" alt="Titan Loterias" className="w-14 h-14 object-contain" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Titan<span className="gradient-brand-text ml-1">Loterias</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Motor estatístico inteligente
              </p>
            </div>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Senha</Label>
                  <Link to="/forgot-password" className="text-xs text-primary/80 hover:text-primary transition-colors">
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" variant="premium" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Entrar
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Ainda não tem conta? Crie a sua em poucos segundos.
                <br />
                Se você já comprou o acesso e não consegue entrar, fale com o suporte.
              </p>

            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-4 font-mono uppercase tracking-widest">
          Motor estatístico v4.0
        </p>
      </motion.div>
    </div>
  );
}