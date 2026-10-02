export function AppFooter() {
  return (
    <footer className="border-t border-border/20 py-8 bg-black/20">
      <div className="container mx-auto px-6 flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 italic">
          <div className="w-2 h-2 rounded-full bg-primary/20 border border-primary/40 animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />
          <span>Titan Loterias — Motor Estatístico v7.5</span>
          <div className="w-2 h-2 rounded-full bg-primary/20 border border-primary/40 animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />
        </div>
        <div className="h-px w-16 bg-border/40" />
        <p className="text-[9px] text-muted-foreground/30 max-w-sm text-center leading-loose font-medium uppercase tracking-widest italic">
          As loterias são eventos aleatórios. Análises estatísticas não garantem resultados. Sorteios são eventos aleatórios. Use com responsabilidade.
        </p>
      </div>
    </footer>
  );
}
