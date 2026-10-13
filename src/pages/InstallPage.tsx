import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Smartphone, Monitor, Share, MoreVertical, Plus, Download, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

type Platform = "android" | "ios";

const steps = {
  android: [
    {
      icon: Monitor,
      title: "Abra no Chrome",
      description: "Acesse o site pelo navegador Google Chrome no seu celular Android.",
    },
    {
      icon: MoreVertical,
      title: "Toque no menu ⋮",
      description: "No canto superior direito do Chrome, toque nos três pontinhos verticais.",
    },
    {
      icon: Download,
      title: 'Selecione "Instalar aplicativo"',
      description: 'No menu que aparecer, toque em "Instalar aplicativo" ou "Adicionar à tela inicial".',
    },
    {
      icon: CheckCircle2,
      title: "Pronto!",
      description: "O app será instalado e aparecerá na sua tela inicial como um aplicativo normal.",
    },
  ],
  ios: [
    {
      icon: Monitor,
      title: "Abra no Safari",
      description: "Acesse o site pelo navegador Safari no seu iPhone ou iPad. Não funciona em outros navegadores.",
    },
    {
      icon: Share,
      title: "Toque em Compartilhar",
      description: "Na barra inferior do Safari, toque no ícone de compartilhamento (quadrado com seta para cima).",
    },
    {
      icon: Plus,
      title: '"Adicionar à Tela de Início"',
      description: 'Role as opções e toque em "Adicionar à Tela de Início". Confirme tocando em "Adicionar".',
    },
    {
      icon: CheckCircle2,
      title: "Pronto!",
      description: "O app será adicionado à sua tela inicial e abrirá em tela cheia, como um app nativo.",
    },
  ],
};

const InstallPage = () => {
  const [platform, setPlatform] = useState<Platform>("android");
  const [installing, setInstalling] = useState(false);
  const navigate = useNavigate();
  const {
    install,
    isInstalled,
    isPreviewHost,
    canPromptInstall,
    needsManualInstall,
    platform: detectedPlatform,
  } = useInstallPrompt();

  useEffect(() => {
    if (detectedPlatform) {
      setPlatform(detectedPlatform);
    }
  }, [detectedPlatform]);

  const handleInstall = async () => {
    if (!canPromptInstall || installing) return;
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  const openPublishedApp = () => {
    // Apontava para `read-create-play.lovable.app`, o nome antigo do projeto.
    // Verificado: devolve HTTP 404 "Project not found". O endereço publicado
    // atual é titanloterias.lovable.app.
    //
    // Override por env para não precisar mexer no código se o domínio mudar de
    // novo (domínio próprio, por exemplo).
    const published = import.meta.env.VITE_PUBLIC_APP_URL || "https://titanloterias.lovable.app";
    window.open(`${published}/install`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Instalar o App — Titan Loterias PWA</title>
        <meta name="description" content="Instale o Titan Loterias como aplicativo no Android, iPhone ou desktop. Guia passo a passo para PWA." />
        <link rel="canonical" href="https://titanloterias.lovable.app/install" />
        <meta property="og:title" content="Instalar o App — Titan Loterias" />
        <meta property="og:description" content="Guia para instalar o Titan Loterias como app PWA no celular ou desktop." />
        <meta property="og:url" content="https://titanloterias.lovable.app/install" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Instalar o App</h1>
            <p className="text-sm text-muted-foreground">
              Instale direto no celular, sem precisar de loja de aplicativos
            </p>
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Instalação rápida</h2>
              <p className="text-sm text-muted-foreground">
                {isInstalled
                  ? "O app já está rodando em modo instalado neste dispositivo."
                  : isPreviewHost
                    ? "A instalação não fica disponível dentro do preview do editor. Abra a versão publicada no navegador do celular."
                    : canPromptInstall
                      ? "Seu dispositivo já permite instalar o app agora com um toque."
                      : needsManualInstall
                        ? "No iPhone e iPad, a instalação é manual pelo botão Compartilhar do Safari."
                        : "Se o botão de instalar não aparecer, siga o passo a passo abaixo no navegador compatível."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {canPromptInstall ? (
                <Button onClick={handleInstall} className="sm:flex-1" disabled={installing}>
                  {installing ? "Preparando instalação..." : "Instalar agora"}
                </Button>
              ) : null}

              {isPreviewHost ? (
                <Button onClick={openPublishedApp} variant="outline" className="sm:flex-1">
                  Abrir versão publicada
                </Button>
              ) : null}

              {isInstalled ? (
                <Button onClick={() => navigate("/")} variant="outline" className="sm:flex-1">
                  Abrir o app
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Platform toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setPlatform("android")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
              platform === "android"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Android
          </button>
          <button
            onClick={() => setPlatform("ios")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
              platform === "ios"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            iPhone / iPad
          </button>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-foreground">
            {platform === "android" ? (
              <span>
                No <strong>Android</strong>, use o <strong>Google Chrome</strong> para instalar. O app funciona em tela cheia e recebe atualizações automáticas.
              </span>
            ) : (
              <span>
                No <strong>iPhone/iPad</strong>, é obrigatório usar o <strong>Safari</strong>. Outros navegadores como Chrome não suportam instalação no iOS.
              </span>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps[platform].map((step, i) => {
            const Icon = step.icon;
            const isLast = i === steps[platform].length - 1;
            return (
              <Card key={i} className={`border transition-all ${isLast ? "border-green-500/30 bg-green-500/5" : "border-border"}`}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${
                    isLast
                      ? "bg-green-500/10 text-green-500"
                      : "bg-primary/10 text-primary"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isLast
                          ? "bg-green-500/10 text-green-500"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {i + 1}
                      </span>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Perguntas frequentes</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-medium text-foreground">O app ocupa espaço no celular?</p>
                <p className="text-muted-foreground">Muito pouco. O app é leve e usa menos de 5 MB.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Preciso atualizar manualmente?</p>
                <p className="text-muted-foreground">Não. O app se atualiza automaticamente ao abrir.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">É seguro?</p>
                <p className="text-muted-foreground">Sim. É o mesmo site, apenas com atalho na tela inicial e experiência em tela cheia.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center pb-8">
          <Button onClick={() => navigate("/")} className="px-8">
            Voltar ao App
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
