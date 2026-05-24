import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allsport Freunde 2026 e.V.",
  description:
    "Gemeinnütziger Sportverein in der Rhein-Main-Region. Fußball, Fitness, Schwimmen und mehr – für alle, die Bewegung und Gemeinschaft lieben.",
  icons: {
    icon: "/logo.svg", // oder .png, .svg
    apple: "/apple-touch-icon.png", // optional, für Apple Touch Icons
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
