// src/components/LoadingScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    Animated,
    ViewStyle,
    TextStyle,
    Dimensions,
} from 'react-native';
import { useTheme, spacing, borderRadius, typography, shadows } from '@/contexts/ThemeContext';

interface LoadingScreenProps {
    message?: string;
    submessage?: string;
    showProgress?: boolean;
    progress?: number;
    variant?: 'default' | 'minimal' | 'branded';
}

const { width } = Dimensions.get('window');

export default function LoadingScreen({
                                          message = 'Loading...',
                                          submessage,
                                          showProgress = false,
                                          progress = 0,
                                          variant = 'default',
                                      }: LoadingScreenProps) {
    const { colors, isDark } = useTheme();

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for branded variant
        if (variant === 'branded') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();

            return () => pulse.stop();
        }
    }, [variant]);

    useEffect(() => {
        if (showProgress) {
            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [progress, showProgress]);

    const containerStyle: ViewStyle = {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: spacing.xl,
    };

    const cardStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        padding: spacing.xl,
        alignItems: 'center',
        ...shadows.lg,
        maxWidth: 320,
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border,
    };

    const logoContainerStyle: ViewStyle = {
        width: 80,
        height: 80,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
        ...shadows.md,
    };

    const logoTextStyle: TextStyle = {
        color: colors.textOnPrimary,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 1,
    };

    const messageStyle: TextStyle = {
        fontSize: typography.xl.fontSize,
        lineHeight: typography.xl.lineHeight,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    };

    const submessageStyle: TextStyle = {
        fontSize: typography.base.fontSize,
        lineHeight: typography.base.lineHeight,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    };

    const progressContainerStyle: ViewStyle = {
        width: '100%',
        height: 6,
        backgroundColor: colors.border,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
        marginTop: spacing.md,
    };

    const progressBarStyle: ViewStyle = {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    };

    const renderMinimal = () => (
        <Animated.View style={[
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            { alignItems: 'center' }
        ]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[messageStyle, { marginTop: spacing.md }]}>
                {message}
            </Text>
            {submessage && (
                <Text style={submessageStyle}>
                    {submessage}
                </Text>
            )}
        </Animated.View>
    );

    const renderDefault = () => (
        <Animated.View style={[
            cardStyle,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}>
            <ActivityIndicator size="large" color={colors.primary} />

            <Text style={[messageStyle, { marginTop: spacing.lg }]}>
                {message}
            </Text>

            {submessage && (
                <Text style={submessageStyle}>
                    {submessage}
                </Text>
            )}

            {showProgress && (
                <View style={progressContainerStyle}>
                    <Animated.View
                        style={[
                            progressBarStyle,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                    extrapolate: 'clamp',
                                }),
                            },
                        ]}
                    />
                </View>
            )}
        </Animated.View>
    );

    const renderBranded = () => (
        <Animated.View style={[
            cardStyle,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}>
            <Animated.View style={[
                logoContainerStyle,
                { transform: [{ scale: pulseAnim }] }
            ]}>
                <Text style={logoTextStyle}>HSE</Text>
            </Animated.View>

            <ActivityIndicator size="large" color={colors.primary} />

            <Text style={[messageStyle, { marginTop: spacing.md }]}>
                {message}
            </Text>

            {submessage && (
                <Text style={submessageStyle}>
                    {submessage}
                </Text>
            )}

            {showProgress && (
                <>
                    <View style={progressContainerStyle}>
                        <Animated.View
                            style={[
                                progressBarStyle,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%'],
                                        extrapolate: 'clamp',
                                    }),
                                },
                            ]}
                        />
                    </View>
                    <Text style={{
                        fontSize: typography.sm.fontSize,
                        color: colors.textTertiary,
                        marginTop: spacing.xs,
                    }}>
                        {Math.round(progress)}%
                    </Text>
                </>
            )}
        </Animated.View>
    );

    const renderContent = () => {
        switch (variant) {
            case 'minimal':
                return renderMinimal();
            case 'branded':
                return renderBranded();
            default:
                return renderDefault();
        }
    };

    return (
        <View style={containerStyle}>
            {renderContent()}
        </View>
    );
}