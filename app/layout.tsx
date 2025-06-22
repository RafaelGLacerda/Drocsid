import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: 'Drocsid',
  description: 'Site baseado no Discord',
  generator: 'Rafael Lacerda',
}

export default function RootLayout({
  children, 
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="/icone.png" type="image/png" />
      <body>{children}</body>
    </html>
  )
}
