import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fontes variáveis hospedadas no próprio projeto (licença SIL OFL, ver app/fonts/).
// Assim o build não depende de acesso ao Google Fonts.
const archivo = localFont({
  src: "./fonts/archivo-variable.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

const publicSans = localFont({
  src: "./fonts/public-sans-variable.woff2",
  variable: "--font-public-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nico Notícias",
  description: "Resumo das principais notícias, indicadores financeiros e previsão do tempo, atualizado diariamente às 3h15.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${publicSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
