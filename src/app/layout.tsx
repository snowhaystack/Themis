import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider, themeInitScript } from '@/components/theme/ThemeProvider'
import { SessionProvider } from '@/components/auth/SessionProvider'

export const metadata: Metadata = {
  title: 'Themis — AI Advisor for Business',
  description:
    'Generate a personalized AI plan for your company: recommended models across Google, Anthropic and OpenAI, costs and environmental impact.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
