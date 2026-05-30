import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { hasClerkPublishableKey } from "@/lib/clerk-public";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spork — AI Chat",
  description: "The AI assistant for everyone. Upgrade to Super Spork for unlimited power.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-[#0a0a0a] text-[#f0f0f0]">
        {children}
      </body>
    </html>
  );

  return hasClerkPublishableKey() ? (
    <ClerkProvider
      dynamic
    >
      {content}
    </ClerkProvider>
  ) : (
    content
  );
}
