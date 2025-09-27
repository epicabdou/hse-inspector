// src/app/(protected)/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Platform, ViewStyle, TextStyle } from "react-native";
import { useTheme, spacing, borderRadius, shadows } from "@/contexts/ThemeContext";
import { Ionicons } from '@expo/vector-icons';

// Note: BlurView might not be available in all Expo setups
// If you get an error, install expo-blur or remove the blur effect

interface TabBarIconProps {
    focused: boolean;
    color: string;
    size: number;
}

const tabScreens = [
    {
        name: "index",
        title: "Analysis",
        icon: (props: TabBarIconProps) => (
            <Ionicons
                name={props.focused ? "search" : "search-outline"}
                size={props.size}
                color={props.color}
            />
        ),
    },
    {
        name: "inspections",
        title: "History",
        icon: (props: TabBarIconProps) => (
            <Ionicons
                name={props.focused ? "list" : "list-outline"}
                size={props.size}
                color={props.color}
            />
        ),
    },
    {
        name: "reports",
        title: "Reports",
        icon: (props: TabBarIconProps) => (
            <Ionicons
                name={props.focused ? "document-text" : "document-text-outline"}
                size={props.size}
                color={props.color}
            />
        ),
    },
    {
        name: "settings",
        title: "Settings",
        icon: (props: TabBarIconProps) => (
            <Ionicons
                name={props.focused ? "settings" : "settings-outline"}
                size={props.size}
                color={props.color}
            />
        ),
    },
] as const;

export default function TabsLayout() {
    const { colors, isDark } = useTheme();

    const tabBarStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: Platform.select({
            ios: 0,
            android: 1,
        }),
        height: Platform.OS === "ios" ? 84 : 64,
        paddingBottom: Platform.OS === "ios" ? 20 : spacing.sm,
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.md,
        elevation: Platform.OS === "android" ? 8 : 0,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: shadows.lg,
        }),
    };

    const tabBarLabelStyle: TextStyle = {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 4,
    };

    const tabBarItemStyle: ViewStyle = {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        marginHorizontal: 2,
    };

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: tabBarStyle,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarLabelStyle: tabBarLabelStyle,
                tabBarItemStyle: tabBarItemStyle,
                tabBarHideOnKeyboard: Platform.OS === 'android',
                tabBarAllowFontScaling: false,
                tabBarLabelPosition: 'below-icon',
                ...(Platform.OS === 'android' && {
                    tabBarActiveBackgroundColor: `${colors.primary}10`,
                }),
            }}
        >
            {tabScreens.map((screen) => (
                <Tabs.Screen
                    key={screen.name}
                    name={screen.name}
                    options={{
                        title: screen.title,
                        tabBarIcon: screen.icon,
                        tabBarAccessibilityLabel: `${screen.title} tab`,
                        tabBarTestID: `tab-${screen.name}`,
                    }}
                />
            ))}
        </Tabs>
    );
}