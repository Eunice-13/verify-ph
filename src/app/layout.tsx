import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import SubNav from "@/components/layout/SubNav";
import Footer from "@/components/layout/Footer";
import FloatingClaimBar from "@/components/layout/FloatingClaimBar";
import CapacityBanner from "@/components/layout/CapacityBanner";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "VerifyPH — Civic News & AI Claim Checker",
  description: "Civic news application & AI-assisted claim checker.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} h-full antialiased`}>
      <head>
        {/* Open Sauce One isn't distributed via Google Fonts — loaded from
            Fontshare exactly as in the original static design, and mapped
            to --font-open-sauce / font-sans in globals.css. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=open-sauce-one@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        <style>{`:root { --font-open-sauce: "Open Sauce One"; }`}</style>
      </head>
      <body className="min-h-full flex flex-col bg-[#f4f1ea] font-sans text-neutral-800">
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <Suspense fallback={null}>
          <SubNav />
        </Suspense>
        <CapacityBanner />
        {children}
        <FloatingClaimBar />
        <Footer />
      </body>
    </html>
  );
}
