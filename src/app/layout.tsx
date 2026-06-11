import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "راهنمای مغازه‌ها — نقشه زنده کسب‌وکارهای محلی",
  description: "اولین اپلیکیشن نقشه‌ای مخصوص مغازه‌های سنتی ایران. جستجو کنید، نزدیک‌ترین مغازه باز را پیدا کنید.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
