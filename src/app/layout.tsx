import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RDC Techno-Commercial Assessment",
  description: "Selling Skill & Technical Skill Assessment for RDC Sales Force",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100">
        {/* Header */}
        <header className="gradient-navy text-white shadow-xl no-print">
          <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div className="w-10 h-10 gradient-orange rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg">
                R
              </div>
              <div>
                <div className="font-bold text-base leading-tight tracking-tight">
                  RDC Concrete
                </div>
                <div className="text-xs text-blue-300 leading-tight font-medium tracking-wide uppercase">
                  Techno-Commercial Assessment
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-blue-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Assessment Platform
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

        <footer className="text-center text-xs text-slate-400 py-6 no-print">
          RDC Concrete India Ltd — Confidential Assessment Tool
        </footer>
      </body>
    </html>
  );
}
