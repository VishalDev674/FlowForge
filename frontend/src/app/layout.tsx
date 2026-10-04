import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowForge // AI Workflow OS & Orchestration Engine',
  description: 'Next-generation cyberpunk visual workflow automation engine and distributed DAG orchestrator.',
  keywords: 'workflow automation, cyberpunk, developer terminal, DAG engine, visual workflow, FlowForge, sci-fi interface',
  openGraph: {
    title: 'FlowForge // Next-Gen Developer Workflow OS',
    description: 'Autonomous orchestration engine and DAG execution platform with real-time telemetry.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
    <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Space+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="cyber-body">
        {/* Subtle Ambient CRT Grid Overlay */}
        <div className="cyber-grid-overlay" pointer-events="none" />
        {children}
      </body>
    </html>
  );
}
