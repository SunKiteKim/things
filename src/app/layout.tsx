import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Providers } from "@/components/providers";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const logo = Montserrat({
  weight: "900",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: "사물을 고르는 일. 오브제 스토어 things.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "사물을 고르는 일. 오브제 스토어 things.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&family=Roboto:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${logo.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
