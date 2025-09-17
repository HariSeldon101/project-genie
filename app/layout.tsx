import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SyncfusionInit } from './syncfusion-init';
// New enterprise notification system
import { NotificationProvider } from '@/lib/notifications/notification-context';
import { NotificationInit } from './notification-init';
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
  title: "Project Genie",
  description: "AI-powered project document generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build the className string safely
  const bodyClassName = [
    geistSans.variable,
    geistMono.variable,
    'antialiased'
  ].filter(Boolean).join(' ');

  return (
    <html lang="en">
      <body
        className={bodyClassName}
        suppressHydrationWarning={true}
      >
        <NotificationProvider>
          <SyncfusionInit />
          <NotificationInit />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
