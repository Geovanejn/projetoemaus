import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { List } from "lucide-react";

interface SectionHeaderProps {
  sectionNumber: number;
  unitNumber: number;
  title: string;
  className?: string;
}

export function SectionHeader({
  sectionNumber,
  unitNumber,
  title,
  className
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative w-full max-w-[320px] mx-auto mb-8",
        className
      )}
      data-testid="section-header"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FFA500] to-[#FF8C00] p-4 shadow-[0_6px_0_0_#CC7000]">
        <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6">
          <div className="w-full h-full rounded-full bg-white/10" />
        </div>
        <div className="absolute bottom-0 right-0 w-16 h-16 -mr-4 -mb-4">
          <div className="w-full h-full rounded-full bg-white/5" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">
                Secao {sectionNumber}, Unidade {unitNumber}
              </p>
              <h2 className="text-lg font-black text-white leading-tight">
                {title}
              </h2>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30"
              data-testid="button-section-menu"
            >
              <List className="h-5 w-5 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
