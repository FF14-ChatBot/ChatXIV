import { MessageSquarePlus, Moon, Sun, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useState, useEffect } from 'react';
// With your own image import:
import mammetIcon from './path/to/your/mammet-icon.png';

export function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    // Initialize theme on mount
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <header className="flex-shrink-0 border-b bg-background/80 backdrop-blur-sm" role="banner">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="size-6 text-primary" />
          <span className="font-semibold text-lg">ChatXIV</span>
        </div>

        {/* Center: MammetBot */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <img src={mammetIcon} alt="Mammet" className="size-8 object-contain border-2 border-primary/30 rounded-full p-0.5" />
          <span className="font-semibold text-lg">MammetBot</span>
        </div>

        {/* Right: Theme Toggle, New Chat, Dropdown */}
        <nav className="flex items-center gap-2" aria-label="App actions">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="size-5" />
            ) : (
              <Sun className="size-5" />
            )}
          </Button>

          <Button variant="outline" size="sm">
            <MessageSquarePlus className="size-4 mr-2" />
            New Chat
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More options">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuItem>About</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}