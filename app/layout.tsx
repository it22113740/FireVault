import type { Metadata } from "next";
import "./globals.css";
import { Anybody, Figtree } from "next/font/google";
import { cn } from "@/lib/utils";

const display = Anybody({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-display",
});

const body = Figtree({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "FireVault · Premium game accounts",
    template: "%s · FireVault",
  },
  description: "Hand-checked, high-level game accounts with fast, manual delivery.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("dark font-sans", display.variable, body.variable)}>
      <body>{children}</body>
    </html>
  );
}
