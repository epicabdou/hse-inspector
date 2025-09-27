// src/app/(protected)/_layout.tsx
import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import LoadingScreen from "@/components/LoadingScreen";

function AuthGate({ children }: { children: React.ReactNode }) {
    const { isSignedIn, isLoaded } = useAuth();
    const { colors, isDark } = useTheme();

    if (!isLoaded) {
        return (
            <LoadingScreen
                message="Authenticating"
                submessage="Verifying your credentials..."
                variant="branded"
            />
        );
    }

    if (!isSignedIn) {
        return <Redirect href="/sign-in" />;
    }

    return (
        <>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />
            <SafeAreaView style={{
                flex: 1,
                backgroundColor: colors.background
            }}>
                {children}
            </SafeAreaView>
        </>
    );
}

export default function ProtectedLayout() {
    const { colors } = useTheme();

    return (
        <AuthGate>
            <Stack
                screenOptions={{
                    headerShown: false,
                    presentation: "card",
                    animation: Platform.select({
                        ios: "slide_from_right",
                        android: "slide_from_right",
                        default: "slide_from_right",
                    }),
                    contentStyle: {
                        backgroundColor: colors.background,
                    },
                }}
            >
                <Stack.Screen
                    name="(tabs)"
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="inspection/[id]"
                    options={{
                        headerShown: false,
                        presentation: "modal",
                        animation: "slide_from_bottom",
                    }}
                />
            </Stack>
        </AuthGate>
    );
}