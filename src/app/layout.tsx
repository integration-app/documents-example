import "./globals.css"
import { ThemeProvider } from "@/app/providers"
import { Header } from "@/components/header"
import { inter } from "@/app/fonts"
import { IntegrationProvider } from "./integration-provider"
import { AuthProvider } from "./auth-provider"
import { Toaster } from 'sonner';

export const metadata = {
  title: {
    default: "Use Case Template",
    template: "%s | Use Case Template",
  },
  description: "Integration.app use case template application",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-white text-gray-900`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <AuthProvider>
            <IntegrationProvider>
              <Header />
              <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
              </main>
            </IntegrationProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
