import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Link as LinkIcon, DollarSign, Award, ArrowUpRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function AffiliateDashboard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  const { data: affiliate, isLoading } = useQuery({
    queryKey: ["affiliate_program", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Try to find existing affiliate record
      const { data, error } = await supabase
        .from("affiliate_program")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching affiliate:", error);
        return null;
      }
      
      if (!data) {
        // Client writes are denied by design: the record is created server-side.
        const { data: created, error: rpcError } = await supabase
          .rpc("ensure_affiliate_program")
          .maybeSingle();

        if (rpcError) {
          console.error("Error creating affiliate record:", rpcError);
          return null;
        }
        return created;
      }
      return data;
    },
    enabled: !!user,
  });

  const referralLink = `${window.location.origin}/signup?ref=${affiliate?.referral_code || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="glass-card border-primary/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Total de Indicações</p>
              <p className="text-2xl font-black font-mono">{affiliate?.total_referrals || 0}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-emerald-500/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Total Ganho</p>
              <p className="text-2xl font-black font-mono text-emerald-400">R$ {affiliate?.total_earned?.toFixed(2) || "0.00"}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-accent/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <Award className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Saldo Disponível</p>
              <p className="text-2xl font-black font-mono text-accent">R$ {affiliate?.balance_available?.toFixed(2) || "0.00"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg font-black uppercase italic tracking-tight">Convide e Ganhe</CardTitle>
          <CardDescription>Acompanhe indicações e valores informados na sua conta. Condições de comissão e pagamento devem ser confirmadas com o suporte antes de divulgar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input value={referralLink} readOnly className="bg-background/50 border-white/10 font-mono text-xs h-11 pr-10" />
              <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
            </div>
            <Button onClick={handleCopy} className="h-11 px-6 gradient-brand text-xs font-black uppercase tracking-widest shrink-0">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copiar Link
            </Button>
          </div>
          
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h4 className="text-xs font-bold uppercase mb-2">Vantagens do Programa Titan:</h4>
            <ul className="grid md:grid-cols-2 gap-2">
              <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary" /> Condições de comissão sujeitas a confirmação
              </li>
              <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary" /> Consulte critérios de pagamento com o suporte
              </li>
              <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary" /> Indicadores disponíveis no painel
              </li>
              <li className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-primary" /> Materiais sujeitos à disponibilidade
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
