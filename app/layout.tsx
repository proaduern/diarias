import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Diárias — FUERN",
  description: "Gestão de diárias da Fundação Universidade do Estado do Rio Grande do Norte",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">
        {children}
      </body>
    </html>
  );
}
