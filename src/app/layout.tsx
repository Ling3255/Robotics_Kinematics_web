import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Robotics Kinematics | EBL Learning Platform",
  description:
    "An interactive EBL-based learning platform for robotics kinematics, from robot basics to advanced inverse kinematics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
