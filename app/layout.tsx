import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { LanguageProvider } from "@/components/ui/LanguageContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moheet Takween — Permit & Licence Portal",
  description: "GCC permit and licence platform — citizen, officer, and admin portals",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <LanguageProvider>
          <ToastProvider>
            <div className="flex flex-col flex-1 min-h-screen relative">
              <main className="flex-1 pb-16">{children}</main>
              {/* Bottom-left fixed footer logo so it fits in all screens without scrolling */}
              <footer className="fixed bottom-6 left-15 z-50 pointer-events-none">
                <img src="/takween.svg" alt="Takween" className="h-9 opacity-80" />
              </footer>
            </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
