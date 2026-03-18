import { ReactNode } from 'react';
import { Header } from './header';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 min-h-0 overflow-auto">
        {children}
      </main>
      <footer className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm py-3">
        <p className="text-xs text-center text-muted-foreground px-4">
          ChatXIV may produce inaccurate information. Please provide feedback and verify with official sources.
        </p>
      </footer>
    </div>
  );
}