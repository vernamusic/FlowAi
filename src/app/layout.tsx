import type { Metadata } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";

import { themeScript } from "@/lib/theme/theme";
import { sidebarScript } from "@/lib/ui/sidebar";

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
    <html lang="en" data-theme="dark" data-sidebar="collapsed" suppressHydrationWarning>
      <head>
        {/**
         * Applies the saved theme and sidebar width before the first
         * paint, so the page never flashes or slides into place.
         */}
        <script
          dangerouslySetInnerHTML={{ __html: `${themeScript}\n${sidebarScript}` }}
        />
      </head>

      <body>{children}</body>
    </html>
  );
}
