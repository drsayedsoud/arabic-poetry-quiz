import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "روائع الشعر العربي | تحدي الذكاء الاصطناعي",
  description: "تطبيق لتوليد أبيات من روائع الشعر العربي واختبار الطالب فيها",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
