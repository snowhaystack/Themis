import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider, themeInitScript } from '@/components/theme/ThemeProvider'
import { SessionProvider } from '@/components/auth/SessionProvider'

// Self-hosted at build time — avoids an external request to Google Fonts
// (which the Content-Security-Policy would otherwise block).
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Themis — AI Advisor for Business',
  description:
    'Generate a personalized AI plan for your company: recommended models across Google, Anthropic and OpenAI, costs and environmental impact.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`light ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
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
