import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Travel Personality Test',
  description: 'Discover your travel personality type through our interactive test',
  openGraph: {
    title: 'Travel Personality Test',
    description: 'Discover your travel personality type through our interactive test',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Travel Personality Test',
    description: 'Discover your travel personality type through our interactive test',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
