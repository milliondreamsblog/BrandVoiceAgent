import "./globals.css";
import Nav from "./nav";
import type { ReactNode } from "react";

export const metadata = {
  title: "Bricx Voice Critic",
  description: "Judge a draft against the Bricx voice rules.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
