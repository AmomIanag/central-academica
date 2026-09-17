import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Central Acadêmica FIAP",
  description: "Centralização das informações acadêmicas do aluno FIAP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
