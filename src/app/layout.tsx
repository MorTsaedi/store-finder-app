import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "راهنمای مغازه‌ها — نقشه زنده کسب‌وکارهای محلی",
  description: "اولین اپلیکیشن نقشه‌ای مخصوص مغازه‌های سنتی ایران. جستجو کنید، نزدیک‌ترین مغازه باز را پیدا کنید.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=overlays-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full">
      <head>
        <link rel="stylesheet" href="/leaflet.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=overlays-content" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
