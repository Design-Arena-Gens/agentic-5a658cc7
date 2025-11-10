import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bharat Life Care - Social Manager AI",
  description: "AI-powered social media manager for Bharat Life Care",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="container py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-brand" />
              <div>
                <h1 className="text-lg font-semibold text-slate-800">Bharat Life Care</h1>
                <p className="text-xs text-slate-500">Social Media Manager AI</p>
              </div>
            </div>
            <nav className="text-sm text-slate-600 flex gap-5">
              <a className="hover:text-slate-900" href="/">Dashboard</a>
              <a className="hover:text-slate-900" href="#calendar">Calendar</a>
              <a className="hover:text-slate-900" href="#workflow">Workflow</a>
              <a className="hover:text-slate-900" href="#assets">Assets</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
