import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PatrimonIA – Inteligência de Investimentos",
  description: "Plataforma educacional e analítica de investimentos para o mercado brasileiro.",
  keywords: "investimentos, ações, FIIs, renda fixa, tesouro direto, simulador, análise, carteira",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} min-h-full antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
