// src/app/_layout.tsx
import React from 'react';
import { Slot } from 'expo-router';
import { ClerkProvider, ClerkLoaded, ClerkLoading } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import LoadingScreen from '@/components/LoadingScreen';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
    throw new Error(
        'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
    );
}

function ThemedStatusBar() {
    const { isDark } = useTheme();
    return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AppContent() {
    return (
        <>
            <ThemedStatusBar />
            <ClerkLoading>
                <LoadingScreen
                    message="Initializing App"
                    submessage="Setting up authentication..."
                    variant="branded"
                />
            </ClerkLoading>
            <ClerkLoaded>
                <Slot />
            </ClerkLoaded>
        </>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ClerkProvider
                tokenCache={tokenCache}
                publishableKey={publishableKey}
            >
                <ThemeProvider>
                    <AppContent />
                </ThemeProvider>
            </ClerkProvider>
        </SafeAreaProvider>
    );
}