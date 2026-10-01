import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { KontoProvider } from "@/components/konto-provider";
import { ProjekteProvider } from "@/components/projekte-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wiederaufbereitungsalternativen",
  description:
    "Taktische Bewertung von Wiederaufbereitungsalternativen im Remanufacturing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${inter.variable} ${sourceCodePro.variable}`}
    >
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <KontoProvider>
            <ProjekteProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </ProjekteProvider>
          </KontoProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
