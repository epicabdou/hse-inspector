// src/hooks/useTabBarHeight.ts
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useTabBarHeight() {
    const insets = useSafeAreaInsets();

    // Standard tab bar heights
    const baseHeight = Platform.OS === 'ios' ? 84 : 64;

    // Total height including safe area
    const totalHeight = Platform.OS === 'ios' ? baseHeight : baseHeight + insets.bottom;

    return {
        height: baseHeight,
        totalHeight,
        bottomPadding: totalHeight,
    };
}