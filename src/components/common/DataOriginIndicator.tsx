import { useLotteryContext } from "@/contexts/LotteryContext";
import { Badge } from "@/components/ui/badge";
import { Database, Server, FileJson, FlaskConical } from "lucide-react";
import { DataOrigin } from "@/engine/data-provider/DataProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function DataOriginIndicator() {
  const { dataOrigin, setDataOrigin, syncing } = useLotteryContext();

  const origins: { id: DataOrigin; label: string; icon: any; color: string }[] = [
    { id: "official", label: "Oficial", icon: Server, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { id: "cache", label: "Cache Local", icon: Database, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { id: "import", label: "Importação", icon: FileJson, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  ];
  // "Simulado" removido da escolha do usuário: análises nunca devem rodar sobre dados fictícios.
  void FlaskConical;

  const current = origins.find(o => o.id === dataOrigin) || origins[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "cursor-pointer hover:opacity-80 transition-all gap-1.5 py-1 px-2 text-[10px] font-bold uppercase tracking-wider",
            current.color,
            syncing && "animate-pulse"
          )}
        >
          <current.icon className="w-3 h-3" />
          {current.label}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-md border-primary/20">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Origem dos Dados</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {origins.map((origin) => (
          <DropdownMenuItem 
            key={origin.id}
            onClick={() => setDataOrigin(origin.id)}
            className={cn(
              "flex items-center gap-2 text-xs py-2 cursor-pointer",
              dataOrigin === origin.id && "bg-primary/10 text-primary"
            )}
          >
            <origin.icon className={cn("w-3.5 h-3.5", origin.id === dataOrigin ? "text-primary" : "text-muted-foreground")} />
            <span>{origin.label}</span>
            {dataOrigin === origin.id && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
