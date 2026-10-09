import { Shield, CreditCard, RefreshCcw, Clock } from "lucide-react";
import { motion } from "framer-motion";

const trustItems = [
  { icon: Shield, label: "Pagamento 100% seguro" },
  { icon: RefreshCcw, label: "Garantia de 7 dias" },
  { icon: CreditCard, label: "Cartão, Pix e mais" },
  { icon: Clock, label: "Sem mensalidade" },
];

export function PlanTrustBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-8"
    >
      {trustItems.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4 text-primary/70" />
          <span className="text-xs font-medium">{label}</span>
        </div>
      ))}
    </motion.div>
  );
}
