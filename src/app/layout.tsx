import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { MuiThemeProvider } from "@/components/MuiThemeProvider";

export const metadata: Metadata = {
  title: "ArihantCRM - Research CRM",
  description: "Secure CRM with 2FA authentication",
   icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-brand-50/40 min-h-screen" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
        <AuthProvider><MuiThemeProvider><ToastProvider>{children}</ToastProvider></MuiThemeProvider></AuthProvider>
      </body>
    </html>
  );
}
