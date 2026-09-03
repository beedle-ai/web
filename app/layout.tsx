import type { Metadata } from "next"
import { Geist_Mono, Syne } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { NoiseOverlay } from "@/components/noise-overlay"
import "./globals.css"

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const syne = Syne({
  variable: "--font-syne",
  weight: "800",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "beedle.ai",
  description: "A new drawing every minute. The same drawing for everyone.",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en" className={`${geistMono.variable} ${syne.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <NoiseOverlay />
        </ThemeProvider>
      </body>
    </html>
  )
}
