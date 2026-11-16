import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Filtons Platform",
  description: "Filtons Stratford Ltd — lettings, property management and client accounting",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
