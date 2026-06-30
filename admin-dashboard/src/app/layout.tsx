import type { Metadata, Viewport } from "next";
import "./globals.css";
import DashboardLayout from "@/components/DashboardLayout";

export const metadata: Metadata = {
  title: "هنا راحتي - لوحة التحكم والإحصائيات",
  description: "لوحة تحكم المشرفين لتطبيق هنا راحتي لإدارة الأنشطة والمستخدمين وإحصائيات القراءة والصلوات.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" style={{ height: '100%' }}>
      <body style={{ minHeight: '100%', margin: 0, padding: 0 }}>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </body>
    </html>
  );
}

