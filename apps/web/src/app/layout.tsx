import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Galene — Calm nights. Whole days.",
  description:
    "Understand what keeps waking you up and change it, without pills. Short lessons, a private 4am journal, and sleep setups matched to your nights.",
  openGraph: {
    title: "Galene — Calm nights. Whole days.",
    description: "Understand what keeps waking you up and change it, without pills.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0b0f1a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </body>
    </html>
  );
}
