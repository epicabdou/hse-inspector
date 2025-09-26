// src/app/(protected)/_layout.tsx
import React from "react";
import { Redirect, Stack, Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
    ActivityIndicator,
    View,
    StyleSheet,
    Text,
    StatusBar,
    Platform,
    SafeAreaView,
    TouchableOpacity,
    ViewStyle,
    TextStyle,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from '@expo/vector-icons';
import CustomButton from "@/components/CustomButton";

function LogoutButton() {
    const { signOut, isSignedIn } = useAuth();
    const { colors } = useTheme();

    const buttonStyle: ViewStyle = {
        marginRight: 16,
        paddingVertical: 4,
    };

    return (
        <View style={buttonStyle}>
            <CustomButton
                text="Logout"
                variant="ghost"
                size="small"
                disabled={!isSignedIn}
                onPress={async () => {
                    try {
                        await signOut();
                    } catch (e) {
                        console.warn("Failed to sign out:", e);
                    }
                }}
            />
        </View>
    );
}

function ThemeToggleButton() {
    const { toggleTheme, isDark, colors } = useTheme();

    const buttonStyle: ViewStyle = {
        marginRight: 8,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    };

    return (
        <TouchableOpacity style={buttonStyle} onPress={toggleTheme}>
            <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={20}
                color={colors.primary}
            />
        </TouchableOpacity>
    );
}

function LoadingScreen() {
    const { colors, isDark } = useTheme();

    const containerStyle: ViewStyle = {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
        paddingHorizontal: 24,
    };

    const contentStyle: ViewStyle = {
        alignItems: "center",
        maxWidth: 280,
        width: "100%",
    };

    const logoContainerStyle: ViewStyle = {
        width: 80,
        height: 80,
        backgroundColor: colors.primary,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    };

    const logoTextStyle: TextStyle = {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 1,
    };

    const loadingTextStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: "500",
        marginBottom: 24,
        textAlign: "center",
    };

    const loadingBarStyle: ViewStyle = {
        width: "100%",
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        overflow: "hidden",
    };

    const loadingProgressStyle: ViewStyle = {
        width: "60%",
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: 2,
    };

    return (
        <>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            <View style={containerStyle}>
                <View style={contentStyle}>
                    <View style={logoContainerStyle}>
                        <Text style={logoTextStyle}>HSE</Text>
                    </View>
                    <ActivityIndicator
                        size="large"
                        color={colors.primary}
                        style={{ marginBottom: 16 }}
                    />
                    <Text style={loadingTextStyle}>Initializing...</Text>
                    <View style={loadingBarStyle}>
                        <View style={loadingProgressStyle} />
                    </View>
                </View>
            </View>
        </>
    );
}

export default function RootLayout() {
    const { isSignedIn, isLoaded } = useAuth();
    const { colors, isDark } = useTheme();

    if (!isLoaded) {
        return <LoadingScreen />;
    }

    if (!isSignedIn) {
        return <Redirect href="/sign-in" />;
    }

    const safeAreaStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
    };

    return (
        <>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            <SafeAreaView style={safeAreaStyle}>
                <StackLayout />
            </SafeAreaView>
        </>
    );
}

function StackLayout() {
    const { colors, isDark } = useTheme();

    const headerStyle: ViewStyle = {
        backgroundColor: colors.surface,
        elevation: Platform.OS === "android" ? 4 : 0,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderBottomWidth: Platform.OS === "ios" ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.border,
        height: Platform.OS === "android" ? 64 : 96,
    };

    const headerTitleStyle: TextStyle = {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        letterSpacing: 0.5,
    };

    const modalHeaderStyle: ViewStyle = {
        backgroundColor: colors.surface,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    };

    return (
        <Stack
            screenOptions={{
                headerTitle: "HSE Inspector",
                headerTitleStyle: headerTitleStyle,
                headerStyle: headerStyle,
                headerTintColor: colors.text,
                headerRight: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ThemeToggleButton />
                        <LogoutButton />
                    </View>
                ),
                headerShadowVisible: true,
                headerTitleAlign: "center",
                presentation: "card",
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen
                name="(tabs)"
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="index"
                options={{
                    title: "Safety Analysis",
                }}
            />
            <Stack.Screen
                name="settings"
                options={{
                    title: "Settings",
                    headerStyle: modalHeaderStyle,
                    presentation: "modal",
                }}
            />
            <Stack.Screen
                name="inspection/[id]"
                options={{
                    title: "Inspection Details",
                    headerBackTitle: "Back",
                }}
            />
        </Stack>
    );
}

function TabsLayout() {
    const { colors, isDark } = useTheme();

    const tabBarStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        height: Platform.OS === "ios" ? 88 : 64,
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
        paddingTop: 8,
        elevation: Platform.OS === "android" ? 8 : 0,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    };

    const tabBarLabelStyle: TextStyle = {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 4,
    };

    const headerStyle: ViewStyle = {
        backgroundColor: colors.surface,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    };

    const headerTitleStyle: TextStyle = {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        letterSpacing: 0.5,
    };

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: tabBarStyle,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarLabelStyle: tabBarLabelStyle,
                headerStyle: headerStyle,
                headerTitleStyle: headerTitleStyle,
                headerRight: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ThemeToggleButton />
                        <LogoutButton />
                    </View>
                ),
                headerShadowVisible: true,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Dashboard",
                    headerTitle: "HSE Dashboard",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="inspections"
                options={{
                    title: "Inspections",
                    headerTitle: "Safety Inspections",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="clipboard-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    headerTitle: "Inspection Reports",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    headerTitle: "App Settings",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}