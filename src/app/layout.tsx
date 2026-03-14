import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sharerr",
  description: "Invite-only media sharing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
