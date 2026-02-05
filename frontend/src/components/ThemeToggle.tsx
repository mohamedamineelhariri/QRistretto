'use client';

import { Sun, Moon } from 'lucide-react';
import { useApp } from '../app/providers';

export function ThemeToggle() {
    const { theme, toggleTheme } = useApp();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-light-border dark:hover:bg-dark-border transition-colors"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? (
                <Moon className="w-5 h-5" />
            ) : (
                <Sun className="w-5 h-5" />
            )}
        </button>
    );
}
