// src/app/(protected)/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    const { colors } = useTheme();

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

    return (
        <Tabs
            screenOptions={{
                headerShown: false, // Remove all headers from tabs
                tabBarStyle: tabBarStyle,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarLabelStyle: tabBarLabelStyle,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Analysis",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="inspections"
                options={{
                    title: "History",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}