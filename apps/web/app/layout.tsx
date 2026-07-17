import { ClerkProvider } from '@clerk/nextjs'
import { Fraunces, JetBrains_Mono, Inter, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
        <body className={`${fraunces.variable} ${jetbrainsMono.variable} ${inter.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}