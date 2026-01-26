import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import logoFlame from "@assets/V1_1764865428588.png";
import { MapPin, ExternalLink } from "lucide-react";

interface SiteContentSection {
  title: string;
  content: string;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

type SiteContentMap = Record<string, SiteContentSection>;

const footerLinks = [
  { label: "Início", href: "/" },
  { label: "Devocionais", href: "/devocionais" },
  { label: "Agenda", href: "/agenda" },
  { label: "Quem Somos", href: "/quem-somos" },
  { label: "Diretoria", href: "/diretoria" },
  { label: "Oração", href: "/oracao" },
];

export function SiteFooter() {
  const { data: siteContent } = useQuery<SiteContentMap>({
    queryKey: ["/api/site-content/quem-somos"],
  });

  const endereco = siteContent?.endereco;

  return (
    <footer className="bg-gray-900 dark:bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ x: 5 }}
            >
              <img 
                src={logoFlame} 
                alt="Logo UMP Emaús" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h3 className="font-bold text-xl">UMP Emaús</h3>
                <p className="text-sm text-gray-400">
                  União de Mocidade Presbiteriana
                </p>
              </div>
            </motion.div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Alegres na esperança, fortes na fé, dedicados no amor e unidos no trabalho.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Links Rápidos</h4>
            <nav className="grid grid-cols-2 gap-2">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    className="text-gray-400 hover:text-primary transition-colors text-sm cursor-pointer"
                    data-testid={`footer-link-${link.href.replace("/", "") || "home"}`}
                  >
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Redes Sociais</h4>
            <div className="flex items-center gap-4">
              <motion.a
                href="https://instagram.com/umpemaus"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                data-testid="footer-instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </motion.a>
              <motion.a
                href="https://facebook.com/umpemaus"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                data-testid="footer-facebook"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </motion.a>
              <motion.a
                href="https://youtube.com/umpemaus"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                data-testid="footer-youtube"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </motion.a>
            </div>

            <div className="pt-4">
              <h4 className="font-semibold text-lg mb-2">Contato</h4>
              <p className="text-gray-400 text-sm">
                marketingumpemaus@gmail.com
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Localização
            </h4>
            <div className="space-y-2">
              <a
                href="https://maps.app.goo.gl/FiqeyqfXabQB6aPr7?g_st=ac"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors group"
                data-testid="footer-location-link"
              >
                <span className="underline-offset-2 group-hover:underline">Igreja Presbiteriana Emaús</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <p className="text-gray-400 text-xs leading-relaxed">
                Rua Abigail Maia, 205 - Jardim Soraia<br />
                São Paulo - SP
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} UMP Emaús. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
