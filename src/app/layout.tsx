import "./globals.css";
import { ThemeProvider } from "@/app/providers";
import { Header } from "@/components/header";
import { IntegrationProvider } from "./integration-provider";
import { AuthProvider } from "./auth-provider";
import { Toaster } from "sonner";
import { Instrument_Sans } from "next/font/google";
import type { Metadata } from "next";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Document Example",
    template: "%s | Document Example",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${instrumentSans.className} antialiased bg-white text-gray-900`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
        >
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
  );
}
