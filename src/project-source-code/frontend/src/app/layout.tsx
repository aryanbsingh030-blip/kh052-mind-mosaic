import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Skill Exchange | Campus Peer Learning & Team Intelligence",
  description:
    "AI-powered campus skill exchange connecting university students based on complementary teaching, learning, and project capabilities.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <OfflineProvider>
          <AuthProvider>
            <Navbar />
            <div className="flex flex-1 mx-auto w-full max-w-7xl">
              <div className="hidden md:block">
                <Sidebar />
              </div>
              <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
                {children}
              </main>
            </div>
          </AuthProvider>
        </OfflineProvider>
      </body>
    </html>
  );
}
