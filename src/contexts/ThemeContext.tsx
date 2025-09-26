// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Colors {
    // Primary colors
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // Background colors
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;

    // Surface colors
    surface: string;
    surfaceSecondary: string;

    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;

    // Border colors
    border: string;
    borderLight: string;

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

    // Special colors
    overlay: string;
    shadow: string;
    glass: string;
}

const lightColors: Colors = {
    primary: '#4F46E5',
    primaryLight: '#6366F1',
    primaryDark: '#3B37E6',

    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    backgroundTertiary: '#F1F5F9',

    surface: '#FFFFFF',
    surfaceSecondary: '#F9FAFB',

    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    successBackground: '#F0FDF4',
    warningBackground: '#FEF3C7',
    errorBackground: '#FEF2F2',
    infoBackground: '#EFF6FF',

    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    glass: 'rgba(255, 255, 255, 0.1)',
};

const darkColors: Colors = {
    primary: '#6366F1',
    primaryLight: '#7C3AED',
    primaryDark: '#4F46E5',

    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',

    surface: '#1E293B',
    surfaceSecondary: '#334155',

    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',

    border: '#475569',
    borderLight: '#334155',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    successBackground: '#064E3B',
    warningBackground: '#78350F',
    errorBackground: '#7F1D1D',
    infoBackground: '#1E3A8A',

    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    glass: 'rgba(255, 255, 255, 0.05)',
};

export interface ThemeContextType {
    colors: Colors;
    isDark: boolean;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

const THEME_STORAGE_KEY = '@theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

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
            }
        };

        loadThemeMode();
    }, []);

    // Save theme preference to storage
    const setThemeMode = async (mode: ThemeMode) => {
        try {
            setThemeModeState(mode);
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (error) {
            console.warn('Failed to save theme mode:', error);
        }
    };

    const toggleTheme = () => {
        const nextMode = isDark ? 'light' : 'dark';
        setThemeMode(nextMode);
    };

    const value: ThemeContextType = {
        colors,
        isDark,
        themeMode,
        setThemeMode,
        toggleTheme,
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

// Theme-aware styles helper
export const createThemedStyles = <T extends Record<string, any>>(
    styleCreator: (colors: Colors, isDark: boolean) => T
) => {
    return (colors: Colors, isDark: boolean): T => styleCreator(colors, isDark);
};