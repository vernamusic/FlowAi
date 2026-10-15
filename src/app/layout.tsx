import type { Metadata } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";

import { themeScript } from "@/lib/theme/theme";

export const metadata: Metadata = {
  title: "FlowAI",
  description: "Visual AI Workflow Builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/**
         * Applies the saved theme before the first paint so the page never
         * flashes the wrong palette.
         */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body>{children}</body>
    </html>
  );
}
