import "./globals.css";
import AppThemeProvider from "@/lib/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "CarAds",
  description: "Realtime car ads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppThemeProvider>
          {children}

          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast: "z-[9999]",
              },
            }}
          />
        </AppThemeProvider>
      </body>
    </html>
  );
}
