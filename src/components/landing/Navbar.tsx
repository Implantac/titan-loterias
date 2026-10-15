import { useScroll, motion } from "framer-motion";
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
      setIsScrolled(latest > 30);
    });
  }, [scrollY]);

  const navLinks = [
    { name: "Recursos", to: "/landing" },
    { name: "Fechamentos", to: "/fechamentos" },
    { name: "Módulo de Bolão", to: "/bolao" },
    { name: "Planos", to: "/planos" },
    { name: "Suporte", to: "/suporte" },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'py-3 bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm' : 'py-5 bg-transparent'}`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-3.5 sm:gap-4 group no-underline"
            onMouseEnter={() => prefetchRoute("/")}
          >
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 sm:border-[2.5px] border-primary/60 shadow-xl shadow-primary/25 group-hover:border-primary group-hover:shadow-primary/50 group-hover:scale-105 transition-all duration-300 shrink-0 bg-black flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Titan Loterias" 
                className="w-full h-full object-cover transition-transform duration-300" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl md:text-[26px] font-extrabold tracking-tight text-white group-hover:text-primary transition-colors leading-tight">
                Titan<span className="text-primary">Loterias</span>
              </span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold tracking-wider uppercase leading-none mt-1">
                Inteligência Quantitativa
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.to}
                onMouseEnter={() => prefetchRoute(link.to)}
                className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate("/login")}
                onMouseEnter={() => prefetchRoute("/login")}
                className="text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-1.5"
              >
                Entrar
              </button>
              <Button 
                onClick={() => navigate("/signup")}
                onMouseEnter={() => prefetchRoute("/signup")}
                className="h-9 sm:h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold gradient-brand text-primary-foreground shadow-md shadow-primary/10 hover:opacity-95 transition-all"
              >
                Acessar Plataforma
                <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden p-2 text-foreground rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-2xl border-b border-white/10 py-6 px-6 space-y-4 shadow-xl"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-foreground hover:text-primary transition-colors border-b border-white/5 pb-2.5"
            >
              {link.name}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-semibold border-border/40"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => { navigate("/signup"); setMobileMenuOpen(false); }}
              className="w-full h-11 rounded-xl text-sm font-semibold gradient-brand text-primary-foreground"
            >
              Acessar Plataforma
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
