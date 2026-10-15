import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2, Mail, Lock, User, ArrowRight, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const nextPath = safeNext(urlParams.get("next"));


  // Get referral code from URL
  const searchParams = new URLSearchParams(window.location.search);
  const refCode = searchParams.get("ref") || localStorage.getItem("titan_ref_code") || "";

  // Save ref code to localStorage if present in URL
  if (searchParams.get("ref")) {
    localStorage.setItem("titan_ref_code", searchParams.get("ref") || "");
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({ title: "Telefone inválido", description: "Informe um número com DDD (10 ou 11 dígitos).", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Check if phone is already in use
    const { data: phoneExists } = await supabase.rpc("check_phone_exists", { _phone: cleanPhone });

    if (phoneExists) {
      setLoading(false);
      toast({ title: "Telefone já cadastrado", description: "Este número de telefone já está vinculado a outra conta.", variant: "destructive" });
      return;
    }

    // IP guard: bloqueia múltiplas contas gratuitas do mesmo IP
    try {
      const { data: guard, error: guardError } = await supabase.functions.invoke("signup-guard", {
        body: { email, mode: "check" },
      });
      
      if (guardError) throw guardError;

      if (guard && guard.allowed === false) {
        setLoading(false);
        toast({
          title: "Limite de Contas Atingido",
          description: "Detectamos múltiplas contas gratuitas associadas a esta conexão de rede. Para garantir a segurança e sustentabilidade da plataforma, limite o número de contas por IP ou assine um plano Vitalício.",
          variant: "destructive",
        });
        return;
      }
    } catch (err: any) {
      console.warn("signup-guard falhou ou bloqueou:", err);
      if (err.status === 403 || err.status === 429 || err.message?.includes("IP")) {
        setLoading(false);
        toast({
          title: "Proteção contra Abuso",
          description: "Seu endereço IP foi temporariamente sinalizado pelo nosso sistema de segurança. Tente novamente mais tarde ou mude sua conexão.",
          variant: "destructive",
        });
        return;
      }
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: fullName, 
          phone_number: cleanPhone,
          referral_code: refCode 
        },
        emailRedirectTo: `${window.location.origin}${nextPath}`,
      },
    });

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
    } else {
      // Se o auto-confirm estiver ligado ou não for necessária confirmação, 
      // o Supabase pode retornar uma sessão imediatamente.
      if (signUpData?.session) {
        toast({ title: "Conta criada!", description: "Bem-vindo ao Titan Loterias." });
        navigate(nextPath, { replace: true });
      } else {
        setSent(true);
      }
    }

  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-md">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl mt-2">Verifique seu email</CardTitle>
              <CardDescription>
                Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>. Clique no link para ativar sua conta.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link to="/login">
                <Button variant="outline" className="gap-2">Voltar ao login</Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

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
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto overflow-hidden border-2 border-primary/40 shadow-xl shadow-primary/20">
                <img src="/logo.png" alt="Titan Loterias" className="w-full h-full object-cover" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Criar <span className="gradient-brand-text">Conta</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Crie sua conta e ative o Acesso Vitalício
              </p>
            </div>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground">Telefone (com DDD)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-0000"
                    value={phone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                      const formatted = v.length > 6
                        ? `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
                        : v.length > 2
                        ? `(${v.slice(0,2)}) ${v.slice(2)}`
                        : v.length > 0
                        ? `(${v}`
                        : "";
                      setPhone(formatted);
                    }}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
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
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
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
                Criar minha conta
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
              <p className="text-sm text-center text-muted-foreground pt-2">
                Já tem conta?{" "}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  Entrar
                </Link>
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
