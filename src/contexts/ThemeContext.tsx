// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Colors {
    // Primary brand colors
    primary: string;
    primaryLight: string;
    primaryDark: string;
    primaryContrast: string;

    // Background colors
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;

    // Surface colors
    surface: string;
    surfaceSecondary: string;
    surfaceElevated: string;

    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;
    textOnPrimary: string;

    // Border colors
    border: string;
    borderLight: string;
    borderFocus: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Status backgrounds
    successBackground: string;
    warningBackground: string;
    errorBackground: string;
    infoBackground: string;

    // Interactive colors
    interactive: string;
    interactiveHover: string;
    interactivePressed: string;

    // Special colors
    overlay: string;
    shadow: string;
    glass: string;
    disabled: string;
    placeholder: string;
}

const lightColors: Colors = {
    primary: '#4F46E5',
    primaryLight: '#6366F1',
    primaryDark: '#3B37E6',
    primaryContrast: '#FFFFFF',

    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    backgroundTertiary: '#F1F5F9',

    surface: '#FFFFFF',
    surfaceSecondary: '#F9FAFB',
    surfaceElevated: '#FFFFFF',

    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textOnPrimary: '#FFFFFF',

    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderFocus: '#4F46E5',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    successBackground: '#F0FDF4',
    warningBackground: '#FEF3C7',
    errorBackground: '#FEF2F2',
    infoBackground: '#EFF6FF',

    interactive: '#3B82F6',
    interactiveHover: '#2563EB',
    interactivePressed: '#1D4ED8',

    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    glass: 'rgba(255, 255, 255, 0.8)',
    disabled: '#D1D5DB',
    placeholder: '#9CA3AF',
};

const darkColors: Colors = {
    primary: '#6366F1',
    primaryLight: '#7C3AED',
    primaryDark: '#4F46E5',
    primaryContrast: '#FFFFFF',

    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',

    surface: '#1E293B',
    surfaceSecondary: '#334155',
    surfaceElevated: '#475569',

    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textOnPrimary: '#FFFFFF',

    border: '#475569',
    borderLight: '#334155',
    borderFocus: '#6366F1',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    successBackground: '#064E3B',
    warningBackground: '#78350F',
    errorBackground: '#7F1D1D',
    infoBackground: '#1E3A8A',

    interactive: '#3B82F6',
    interactiveHover: '#2563EB',
    interactivePressed: '#1D4ED8',

    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    glass: 'rgba(255, 255, 255, 0.05)',
    disabled: '#475569',
    placeholder: '#64748B',
};

export interface ThemeContextType {
    colors: Colors;
    isDark: boolean;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => Promise<void>;
    toggleTheme: () => Promise<void>;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

const THEME_STORAGE_KEY = '@hse_theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [isLoading, setIsLoading] = useState(true);

    // Determine if current theme should be dark
    const isDark = themeMode === 'system'
        ? systemColorScheme === 'dark'
        : themeMode === 'dark';

    const colors = isDark ? darkColors : lightColors;

    // Load theme preference from storage
    useEffect(() => {
        const loadThemeMode = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
                    setThemeModeState(savedMode as ThemeMode);
                }
            } catch (error) {
                console.warn('Failed to load theme mode:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadThemeMode();
    }, []);

    // Save theme preference to storage
    const setThemeMode = async (mode: ThemeMode): Promise<void> => {
        try {
            setThemeModeState(mode);
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (error) {
            console.warn('Failed to save theme mode:', error);
            throw new Error('Failed to save theme preference');
        }
    };

    const toggleTheme = async (): Promise<void> => {
        const nextMode = isDark ? 'light' : 'dark';
        await setThemeMode(nextMode);
    };

    const value: ThemeContextType = {
        colors,
        isDark,
        themeMode,
        setThemeMode,
        toggleTheme,
        isLoading,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Theme-aware styles helper with better typing
export const createThemedStyles = <T extends Record<string, any>>(
    styleCreator: (colors: Colors, isDark: boolean) => T
): ((colors: Colors, isDark: boolean) => T) => {
    return (colors: Colors, isDark: boolean): T => styleCreator(colors, isDark);
};

// Spacing system
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
} as const;

// Typography scale
export const typography = {
    xs: { fontSize: 12, lineHeight: 16 },
    sm: { fontSize: 14, lineHeight: 20 },
    base: { fontSize: 16, lineHeight: 24 },
    lg: { fontSize: 18, lineHeight: 28 },
    xl: { fontSize: 20, lineHeight: 28 },
    '2xl': { fontSize: 24, lineHeight: 32 },
    '3xl': { fontSize: 30, lineHeight: 36 },
    '4xl': { fontSize: 36, lineHeight: 40 },
} as const;

// Border radius system
export const borderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
} as const;

// Shadow presets
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
} as const;