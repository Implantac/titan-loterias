import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { prefetchRoute } from "@/lib/routePrefetch";

export function Navbar() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  const navLinks = [
    { name: "Recursos", to: "/landing" },
    { name: "Estatísticas", to: "/estatisticas" },
    { name: "Planos", to: "/planos" },
    { name: "Suporte", to: "/suporte" },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'py-4 bg-background/80 backdrop-blur-xl border-b border-white/5' : 'py-8 bg-transparent'}`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-3 md:gap-4 group no-underline"
            onMouseEnter={() => prefetchRoute("/")}
          >
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl rotate-45 group-hover:rotate-90 transition-transform duration-700 shadow-gold-glow" />
              <img 
                src="/logo.png" 
                alt="Titan" 
                className="relative z-10 w-6 h-6 md:w-8 md:h-8 object-contain drop-shadow-xl" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black uppercase tracking-tighter italic leading-none group-hover:text-primary transition-colors">
                Titan<span className="text-primary/70">Loterias</span>
              </span>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-primary/50 italic leading-none mt-1">
                Análise Estatística
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.to}
                onMouseEnter={() => prefetchRoute(link.to)}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors italic"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/login")}
                onMouseEnter={() => prefetchRoute("/login")}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground hover:text-primary transition-colors italic"
              >
                Entrar
              </button>
              <Button 
                onClick={() => navigate("/signup")}
                onMouseEnter={() => prefetchRoute("/signup")}
                className="h-10 md:h-12 px-6 md:px-8 rounded-2xl text-xs md:text-sm font-black uppercase tracking-widest gradient-brand text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.05] transition-all duration-300"
              >
                Acesso Elite
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-2xl border-b border-white/10 py-8 px-6 space-y-6"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-lg font-black uppercase tracking-widest text-foreground italic border-b border-white/5 pb-4"
            >
              {link.name}
            </Link>
          ))}
          <div className="flex flex-col gap-4 pt-4">
            <Button 
              onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
              variant="outline"
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest border-primary/20 italic"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => { navigate("/signup"); setMobileMenuOpen(false); }}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest gradient-brand text-primary-foreground italic"
            >
              Acesso Elite
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
