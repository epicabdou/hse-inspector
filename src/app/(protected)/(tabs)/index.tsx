// src/app/(protected)/(tabs)/index.tsx
import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnalyzePhotoScreen from "@/components/AnalyzePhotoScreen";
import { useTheme } from '@/contexts/ThemeContext';

export default function TabIndex() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    // Calculate proper bottom padding to account for tab bar
    const tabBarHeight = Platform.OS === 'ios' ? 84 : 64;
    const bottomPadding = Platform.OS === 'ios' ? tabBarHeight : tabBarHeight + insets.bottom;

    return (
        <View style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingBottom: bottomPadding,
        }}>
            <AnalyzePhotoScreen
                apiBaseUrl="https://hseappapi.vercel.app"
                // tokenTemplate="backend" // optional
            />
        </View>
    );
}