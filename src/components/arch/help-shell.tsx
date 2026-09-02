import { Link } from "@tanstack/react-router";
import { ArchLogo } from "@/components/arch/logo";
import { motion, useScroll } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { ReactNode } from "react";

export function HelpShell({ 
  children, 
  title, 
  description,
  showSearch = false
}: { 
  children: ReactNode; 
  title: string; 
  description?: string;
  showSearch?: boolean;
}) {
  const { scrollYProgress } = useScroll();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden font-inter">
      {/* Dynamic Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="hover:opacity-80 transition-opacity" aria-label="Metrixcom Home">
              <ArchLogo size={24} />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-muted-foreground">
              <Link to={"/blog" as any} className="hover:text-foreground transition-colors">Blog</Link>
              <Link to="/help" className="hover:text-foreground transition-colors">Help Center</Link>
              <Link to={"/changelog" as any} className="hover:text-foreground transition-colors">Changelog</Link>
            </nav>
          </div>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to App
          </Link>
        </div>
      </header>

      <main className="relative pt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">{title}</h1>
            {description && (
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                {description}
              </p>
            )}

            {showSearch && (
              <div className="mt-8 max-w-xl relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search articles, guides, and more..." 
                  className="w-full bg-surface border border-border rounded-xl py-3.5 pl-11 pr-4 text-[14px] outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            )}
          </motion.div>

          {children}
        </div>
      </main>

      <footer className="border-t border-border/50 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[13px] text-muted-foreground font-medium">
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/help" className="hover:text-foreground transition-colors">Support</Link>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest opacity-50">
            © 2026 METRIXCOMM. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>
  );
}

export function MotionSection({ 
  children, 
  className,
  delay = 0 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.45, 0.32, 0.9] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}