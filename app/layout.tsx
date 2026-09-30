import type { Metadata } from "next";
import "./globals.css";
import {Theme} from './theme';
export const metadata: Metadata = {
 title: "Fivefold — Your daily habit tracker",
 description: "Track five habits, build streaks, and see your year in colour.",
 icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en" suppressHydrationWarning><body><Theme>{children}</Theme></body></html>;
}
