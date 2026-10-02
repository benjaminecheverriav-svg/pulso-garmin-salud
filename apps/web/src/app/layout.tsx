import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import "@/styles/tokens.css";
import "@/styles/layout.css";
import "@/styles/components.css";
import "@/styles/views.css";
import "@/styles/coach.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Pulso · Salud y rendimiento",
  description: "Panel local de salud y rendimiento con los datos de tu Garmin.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
