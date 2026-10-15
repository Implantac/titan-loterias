import { motion } from "framer-motion";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  onImport?: (isSilent?: boolean) => void;
  onImportAll?: () => void;
  lotteryName?: string;
  syncing?: boolean;
}

export function EmptyState({ title = "Banco de dados vazio", description, onImport, onImportAll, lotteryName, syncing }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl glass-card p-12 text-center space-y-6 border border-dashed border-primary/20 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="relative w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 border border-primary/20">
        <Database className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
      </div>
      <div className="relative">
        <h3 className="text-xl font-black text-foreground uppercase tracking-tight italic">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto font-medium leading-relaxed">
          {description || "Sincronize os dados históricos oficiais para iniciar o processamento de cobertura estatística."}
        </p>
      </div>
      {onImport && (
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button 
            onClick={() => onImport()} 
            disabled={syncing} 
            className="gap-2.5 h-12 px-8 rounded-2xl gradient-brand text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Importar {lotteryName}
          </Button>
          {onImportAll && (
            <Button 
              onClick={onImportAll} 
              disabled={syncing} 
              variant="outline" 
              className="gap-2.5 h-12 px-8 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Full Sync
            </Button>
          )}
        </div>
      )}
    </motion.div>

  );
}
