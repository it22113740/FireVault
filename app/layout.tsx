import type { Metadata, Viewport } from "next";
import { Inter, Oxanium } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oxanium = Oxanium({ subsets: ["latin"], variable: "--font-oxanium" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FireVault · Game accounts & top-ups",
    template: "%s · FireVault",
  },
  description:
    "Browse game accounts and top-up packs, then buy directly on WhatsApp with manual payment.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("dark", inter.variable, oxanium.variable)}>
      <body>
        <NextTopLoader color="#ff8a00" height={2} showSpinner={false} />
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
