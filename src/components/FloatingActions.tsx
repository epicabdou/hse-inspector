// src/components/FloatingActions.tsx
import React from 'react';
import {
    View,
    TouchableOpacity,
    ViewStyle,
    Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';

interface FloatingActionsProps {
    showLogout?: boolean;
}

export default function FloatingActions({ showLogout = true }: FloatingActionsProps) {
    const { toggleTheme, isDark, colors } = useTheme();
    const { signOut, isSignedIn } = useAuth();

    const containerStyle: ViewStyle = {
        position: 'absolute',
        top: Platform.select({ ios: 50, android: 30 }),
        right: 16,
        flexDirection: 'row',
        gap: 8,
        zIndex: 1000,
    };

    const buttonStyle: ViewStyle = {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (e) {
            console.warn("Failed to sign out:", e);
        }
    };

    return (
        <View style={containerStyle}>
            <TouchableOpacity style={buttonStyle} onPress={toggleTheme}>
                <Ionicons
                    name={isDark ? 'sunny' : 'moon'}
                    size={20}
                    color={colors.primary}
                />
            </TouchableOpacity>

            {showLogout && isSignedIn && (
                <TouchableOpacity style={buttonStyle} onPress={handleLogout}>
                    <Ionicons
                        name="log-out-outline"
                        size={20}
                        color={colors.error}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}