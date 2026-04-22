import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PatrimonIA – Inteligência de Investimentos",
  description: "Plataforma educacional e analítica de investimentos para o mercado brasileiro.",
  keywords: "investimentos, ações, FIIs, renda fixa, tesouro direto, simulador, análise, carteira",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
