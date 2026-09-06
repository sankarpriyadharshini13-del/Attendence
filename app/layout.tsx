import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ModalProvider } from "@/components/ModalProvider";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "AttendTrack",
  description: "Mobile-first employee attendance tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AttendTrack",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <ToastProvider>
          <ModalProvider>
            <div className="pb-24 md:pb-8">{children}</div>
            <BottomNav />
          </ModalProvider>
        </ToastProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
