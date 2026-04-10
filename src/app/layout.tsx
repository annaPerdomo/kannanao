import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import Providers from "./providers";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/AuthGuard";
import { AppBackground } from "@/components/AppBackground";

export const metadata: Metadata = {
  title: "語学 — Japanese Flashcards",
  description: "AI-powered Japanese flashcard studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;600&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>Kannanao: Japanese Flashcards</title>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌸</text></svg>"
        />
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#EC4899" />
        {/* iOS home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="語学" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
      </head>
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <AppBackground>
              <NavBar />
              <AuthGuard>{children}</AuthGuard>
              <Footer />
            </AppBackground>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
