import type { Metadata } from "next";
import { Box } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import Providers from "./providers";
import { NavBar } from "@/components/NavBar";

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
      </head>
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <Box
              sx={{
                minHeight: "100vh",
                bgcolor: "background.default",
                backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(249,168,212,0.18) 0%, transparent 28%),
              radial-gradient(circle at 80% 15%, rgba(196,181,253,0.14) 0%, transparent 26%),
              radial-gradient(circle at 50% 85%, rgba(255,219,235,0.7) 0%, transparent 32%)
            `,
              }}
            >
              <NavBar />
              {children}
            </Box>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
