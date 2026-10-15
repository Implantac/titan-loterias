import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { burstConfetti } from "@/lib/confetti";

export function FloatingCTA() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    burstConfetti(e);
    setTimeout(() => navigate("/planos"), 400);
  }, [navigate]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            size="lg"
            onClick={handleClick}
            className="gradient-brand text-primary-foreground shadow-2xl shadow-primary/30 gap-2 px-6 h-12 text-sm font-bold rounded-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Vitalício Fundador R$ 99,90 <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
