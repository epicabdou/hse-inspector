// src/app/(protected)/_layout.tsx
import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
    ActivityIndicator,
    View,
    StyleSheet,
    Text,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

/** --------------------------
 *  Loading screen
 *  -------------------------- */
const LoadingScreen = React.memo(function LoadingScreen() {
    const { colors, isDark } = useTheme();

    return (
        <>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContent}>
                    <View
                        style={[
                            styles.logoBox,
                            {
                                backgroundColor: colors.primary,
                                shadowColor: colors.shadow,
                            },
                        ]}
                    >
                        <Text style={styles.logoText}>HSE</Text>
                    </View>

                    <ActivityIndicator size="large" color={colors.primary} style={styles.mb16} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Initializing...</Text>

                    <View style={[styles.loadingBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.loadingProgress, { backgroundColor: colors.primary }]} />
                    </View>
                </View>
            </View>
        </>
    );
});

/** --------------------------
 *  AuthGate wrapper
 *  -------------------------- */
function AuthGate({ children }: { children: React.ReactNode }) {
    const { isSignedIn, isLoaded } = useAuth();
    const { colors, isDark } = useTheme();

    if (!isLoaded) return <LoadingScreen />;
    if (!isSignedIn) return <Redirect href="/sign-in" />;

    return (
        <>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
            />
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>{children}</SafeAreaView>
        </>
    );
}

/** --------------------------
 *  Root layout (Stack with no headers)
 *  -------------------------- */
export default function RootLayout() {
    return (
        <AuthGate>
            <Stack
                screenOptions={{
                    headerShown: false, // Remove all headers globally
                    presentation: "card",
                    animation: "slide_from_right",
                }}
            >
                {/* Tab stack host - no header */}
                <Stack.Screen name="(tabs)" />
            </Stack>
        </AuthGate>
    );
}

/** --------------------------
 *  Styles
 *  -------------------------- */
const styles = StyleSheet.create({
    // Loading screen
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    loadingContent: {
        alignItems: "center",
        maxWidth: 280,
        width: "100%",
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    logoText: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 1,
    },
    mb16: { marginBottom: 16 },
    loadingText: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 24,
        textAlign: "center",
    },
    loadingBar: {
        width: "100%",
        height: 4,
        borderRadius: 2,
        overflow: "hidden",
    },
    loadingProgress: {
        width: "60%",
        height: "100%",
        borderRadius: 2,
    },
});