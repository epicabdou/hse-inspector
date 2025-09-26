// src/app/(auth)/_layout.tsx
import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ActivityIndicator, View, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuthLayout() {
    console.log('Auth layout');
    const { isSignedIn, isLoaded } = useAuth();
    const { colors, isDark } = useTheme();

    const loadingContainerStyle: ViewStyle = {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    };

    if (!isLoaded) {
        return (
            <View style={loadingContainerStyle}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    if (isSignedIn) {
        return <Redirect href={'/'} />;
    }

    const headerStyle: ViewStyle = {
        backgroundColor: colors.surface,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderBottomWidth: Platform.OS === "ios" ? 0.5 : 0,
        borderBottomColor: colors.border,
    };

    return (
        <Stack
            screenOptions={{
                headerStyle: headerStyle,
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.text,
                },
                contentStyle: {
                    backgroundColor: colors.background,
                },
            }}
        >
            <Stack.Screen
                name='sign-in'
                options={{ headerShown: false, title: 'Sign in' }}
            />
            <Stack.Screen
                name='sign-up'
                options={{
                    title: 'Create Account',
                    headerBackTitle: 'Back',
                }}
            />
            <Stack.Screen
                name='verify'
                options={{
                    title: 'Verify Email',
                    headerBackTitle: 'Back',
                }}
            />
        </Stack>
    );
}