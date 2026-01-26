import { Home, Compass, Trophy, User, BookOpen, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  activeColor: string;
}

const navItems: NavItem[] = [
  { path: "", icon: Home, label: "Início", activeColor: "#A855F7" },
  { path: "/estudos", icon: BookOpen, label: "Estudos", activeColor: "#A855F7" },
  { path: "/events", icon: Sparkles, label: "Eventos", activeColor: "#A855F7" },
  { path: "/explore", icon: Compass, label: "Explorar", activeColor: "#A855F7" },
  { path: "/ranking", icon: Trophy, label: "Ranking", activeColor: "#F97316" },
  { path: "/profile", icon: User, label: "Perfil", activeColor: "#A855F7" },
];

export function BottomNav() {
  const [location] = useLocation();
  
  const isPreviewMode = location.startsWith("/study-preview");
  const baseRoute = isPreviewMode ? "/study-preview" : "/study";

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background border-t border-border",
        "safe-area-bottom"
      )}
      data-testid="bottom-nav"
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const fullPath = baseRoute + item.path;
          let isActive = location === fullPath;
          
          if (item.path === "") {
            isActive = location === baseRoute || 
              location.startsWith(baseRoute + "/lesson");
          } else if (item.path === "/estudos") {
            isActive = location === fullPath || 
              location.startsWith(baseRoute + "/estudos") ||
              location.startsWith(baseRoute + "/season/");
          } else if (item.path === "/events") {
            isActive = location === fullPath || 
              location.startsWith(baseRoute + "/events");
          } else {
            isActive = isActive || location.startsWith(fullPath);
          }
          
          return (
            <Link 
              key={item.path} 
              href={fullPath}
              className="flex-1"
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full",
                  "transition-colors relative"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  animate={isActive ? { y: -2 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative"
                >
                  <item.icon 
                    className={cn(
                      "h-7 w-7 transition-all duration-200",
                      isActive 
                        ? "stroke-[2.5]"
                        : "text-muted-foreground/60 stroke-[1.5]"
                    )}
                    style={isActive ? { color: item.activeColor } : undefined}
                  />
                </motion.div>
                
                <span 
                  className={cn(
                    "text-[10px] font-bold transition-colors",
                    isActive 
                      ? "text-foreground" 
                      : "text-muted-foreground/60"
                  )}
                >
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div
                    layoutId="nav-active-indicator"
                    className="absolute -top-0.5 w-12 h-1 rounded-full"
                    style={{ backgroundColor: item.activeColor }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
