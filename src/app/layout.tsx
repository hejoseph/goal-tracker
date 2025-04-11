import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GoalProvider } from "@/contexts/GoalContext";
import ErrorHandler from "@/components/ErrorHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Goal Tracker",
  description: "Track your goals and steps to achieve them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GoalProvider>
          {children}
          <ErrorHandler />
        </GoalProvider>
      </body>
    </html>
  );
}
