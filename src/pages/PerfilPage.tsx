import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { openCustomerPortal } from "@/modules/subscriptions/application/subscriptionService";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Camera, Loader2, Save, User, Lock, Volume2, VolumeX, Play, Sun, Moon, Monitor, CreditCard, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSoundSettings } from "@/hooks/useSoundSettings";
import { playTierPreview } from "@/lib/alert-sounds";
import UserPreferencesPanel from "@/components/UserPreferencesPanel";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { GamificationCard } from "@/components/GamificationCard";
import { AchievementDisplay } from "@/components/lottery/AchievementDisplay";
import { PushNotificationsCard } from "@/components/settings/PushNotificationsCard";
import { AlertsConfigCard } from "@/components/settings/AlertsConfigCard";
import { BetResultsCheckerCard } from "@/components/settings/BetResultsCheckerCard";

export default function PerfilPage() {
  const { user, profile, session } = useAuth();
  const { toast } = useToast();
  const sound = useSoundSettings();
  const { theme, setTheme } = useTheme();
  const { currentPlan, isAdmin, isSuperAdmin } = usePlanAccess();

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (user) {
      supabase
        .from("profiles")
        .update({ theme_preference: newTheme } as any)
        .eq("id", user.id)
        .then();
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const isPaidPlan = currentPlan !== "free";

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const result = await openCustomerPortal(session?.access_token);
      if (result?.url) {
        window.open(result.url, "_blank");
      } else {
        throw new Error("URL do portal não recebida");
      }
    } catch (err: any) {
      toast({ title: "Erro ao abrir portal", description: err.message, variant: "destructive" });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(url);
      toast({ title: "Avatar atualizado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar avatar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;
      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      <GamificationCard />

      <PushNotificationsCard />
      <AlertsConfigCard />
      <BetResultsCheckerCard />


      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Conquistas & Badges</CardTitle>
          <CardDescription>Seu progresso na plataforma Titan</CardDescription>
        </CardHeader>
        <CardContent>
          <AchievementDisplay />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Foto de Perfil</CardTitle>
          <CardDescription>Clique na imagem para alterar seu avatar</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar className="w-24 h-24 border-2 border-primary/20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
              aria-label="Selecionar foto de perfil"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={user?.email || ""} disabled className="opacity-70" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label>Plano atual</Label>
            <div className="px-3 py-2 rounded-md bg-muted/50 border border-border/30 text-sm font-medium capitalize text-foreground">
              {currentPlan}
            </div>
          </div>
          {isPaidPlan && !isAdmin && !isSuperAdmin && (
            <Button
              onClick={handleManageSubscription}
              disabled={openingPortal}
              variant="outline"
              className="w-full gap-2 border-primary/30 hover:border-primary/50 text-primary"
            >
              {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Gerenciar Assinatura
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      {/* Theme Preference */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            Aparência
          </CardTitle>
          <CardDescription>Escolha o tema da interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "light", label: "Claro", icon: Sun },
              { value: "dark", label: "Escuro", icon: Moon },
              { value: "system", label: "Sistema", icon: Monitor },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                  theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <UserPreferencesPanel />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Alterar Senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>
          <Button
            onClick={async () => {
              if (newPassword.length < 6) {
                toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
                return;
              }
              if (newPassword !== confirmPassword) {
                toast({ title: "As senhas não coincidem", variant: "destructive" });
                return;
              }
              setChangingPassword(true);
              try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                toast({ title: "Senha alterada com sucesso!" });
                setNewPassword("");
                setConfirmPassword("");
              } catch (err: any) {
                toast({ title: "Erro ao alterar senha", description: err.message, variant: "destructive" });
              } finally {
                setChangingPassword(false);
              }
            }}
            disabled={changingPassword || !newPassword}
            variant="outline"
            className="w-full gap-2"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {sound.muted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
            Alertas Sonoros
          </CardTitle>
          <CardDescription>Controle o volume e silencie os alertas de acertos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mute toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Ativar sons de alerta</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Sons ao detectar acertos em sorteios</p>
            </div>
            <Switch checked={!sound.muted} onCheckedChange={(checked) => sound.setMuted(!checked)} />
          </div>

          {/* Volume slider */}
          <div className={`space-y-3 ${sound.muted ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Volume</Label>
              <span className="text-xs font-mono text-muted-foreground">{sound.volume}%</span>
            </div>
            <Slider
              value={[sound.volume]}
              onValueChange={([v]) => sound.setVolume(v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Preview buttons */}
          <div className={`space-y-2 ${sound.muted ? "opacity-40 pointer-events-none" : ""}`}>
            <Label className="text-sm font-medium">Testar sons por faixa</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { tier: "low" as const, label: "Poucos acertos", emoji: "🔔" },
                { tier: "mid" as const, label: "Acertos médios", emoji: "🎵" },
                { tier: "high" as const, label: "Muitos acertos", emoji: "🎶" },
                { tier: "jackpot" as const, label: "Jackpot!", emoji: "🏆" },
              ]).map(({ tier, label, emoji }) => (
                <Button
                  key={tier}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 text-xs"
                  onClick={() => playTierPreview(tier)}
                >
                  <Play className="w-3 h-3" />
                  {emoji} {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
