// src/components/TabAwareScrollView.tsx
import React from 'react';
import { ScrollView, ScrollViewProps, Platform } from 'react-native';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

interface TabAwareScrollViewProps extends ScrollViewProps {
    children: React.ReactNode;
}

export function TabAwareScrollView({
                                       children,
                                       contentContainerStyle,
                                       ...props
                                   }: TabAwareScrollViewProps) {
    const { bottomPadding } = useTabBarHeight();

    return (
        <ScrollView
            {...props}
            contentContainerStyle={[
                { paddingBottom: bottomPadding },
                contentContainerStyle,
            ]}
        >
            {children}
        </ScrollView>
    );
}

// Alternative: Direct fix for the AnalyzePhotoScreen component
// Update the scrollContentStyle in AnalyzePhotoScreen.tsx:

const scrollContentStyle: ViewStyle = {
    paddingTop: Platform.select({ ios: 60, android: 40, default: 40 }),
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Fixed bottom padding for tab bar
};

// If you want to apply this globally, add this to your theme context:
export const getTabAwarePadding = () => {
    return {
        paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    };
};

// Quick CSS-style fix for any screen:
const screenWithTabBarStyle = {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 84 : 64,
};