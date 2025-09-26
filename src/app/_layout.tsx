// src/app/_layout.tsx
import { Slot } from 'expo-router';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    console.log('Root layout');

    return (
        <SafeAreaProvider>
            <ClerkProvider tokenCache={tokenCache}>
                <ThemeProvider>
                    <StatusBar style="auto" />
                    <Slot />
                </ThemeProvider>
            </ClerkProvider>
        </SafeAreaProvider>
    );
}