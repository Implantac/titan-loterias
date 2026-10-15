import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh px-4 relative overflow-hidden">
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden border border-primary/30">
              <img src="/logo.png" alt="Titan Loterias" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold gradient-brand-text font-display">Titan Loterias</span>
          </Link>
        </div>

        <Card className="border-border/30 glass-card">
          {sent ? (
            <>
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-lg">Email enviado</CardTitle>
                <CardDescription>
                  Verifique sua caixa de entrada em <strong className="text-foreground">{email}</strong> para redefinir a senha.
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-center">
                <Link to="/login">
                  <Button variant="outline" className="gap-2 border-border/50 hover:border-primary/30">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao login
                  </Button>
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-4">
                <div className="w-14 h-14 rounded-2xl bg-neon-amber/10 border border-neon-amber/20 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-7 h-7 text-neon-amber" />
                </div>
                <CardTitle className="text-lg">Esqueceu a senha?</CardTitle>
                <CardDescription>Digite seu email para receber o link de redefinição</CardDescription>
              </CardHeader>
              <form onSubmit={handleReset}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50" required />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full gradient-brand text-primary-foreground shadow-lg shadow-primary/20" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enviar link de redefinição
                  </Button>
                  <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="w-3 h-3 inline mr-1" />Voltar ao login
                  </Link>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
