// src/components/CustomButton.tsx
import React from 'react';
import {
    Pressable,
    Text,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    PressableProps,
    PressableStateCallbackType,
    View,
} from 'react-native';
import { useTheme, spacing, borderRadius, shadows, typography } from '@/contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface CustomButtonProps extends Omit<PressableProps, 'style'> {
    text: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle;
}

const sizeConfig = {
    sm: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        minHeight: 32,
        borderRadius: borderRadius.md,
        typography: typography.sm,
        iconSize: 16,
    },
    md: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 44,
        borderRadius: borderRadius.lg,
        typography: typography.base,
        iconSize: 20,
    },
    lg: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 52,
        borderRadius: borderRadius.xl,
        typography: typography.lg,
        iconSize: 24,
    },
    xl: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        minHeight: 60,
        borderRadius: borderRadius.xl,
        typography: typography.xl,
        iconSize: 28,
    },
} as const;

export default function CustomButton({
                                         text,
                                         variant = 'primary',
                                         size = 'md',
                                         fullWidth = false,
                                         loading = false,
                                         disabled,
                                         icon,
                                         iconPosition = 'left',
                                         style,
                                         textStyle,
                                         ...props
                                     }: CustomButtonProps) {
    const { colors, isDark } = useTheme();
    const config = sizeConfig[size];

    const isDisabled = disabled || loading;

    const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
        const variants = {
            primary: {
                container: {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    ...shadows.md,
                },
                text: {
                    color: colors.textOnPrimary,
                },
            },
            secondary: {
                container: {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    ...shadows.sm,
                },
                text: {
                    color: colors.text,
                },
            },
            outline: {
                container: {
                    backgroundColor: 'transparent',
                    borderColor: colors.primary,
                    borderWidth: 2,
                },
                text: {
                    color: colors.primary,
                },
            },
            ghost: {
                container: {
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0,
                },
                text: {
                    color: colors.primary,
                },
            },
            danger: {
                container: {
                    backgroundColor: colors.error,
                    borderColor: colors.error,
                    borderWidth: 1,
                    ...shadows.md,
                },
                text: {
                    color: colors.textOnPrimary,
                },
            },
            success: {
                container: {
                    backgroundColor: colors.success,
                    borderColor: colors.success,
                    borderWidth: 1,
                    ...shadows.md,
                },
                text: {
                    color: colors.textOnPrimary,
                },
            },
        };

        return variants[variant];
    };

    const getPressedStyles = (): ViewStyle => {
        const pressedVariants = {
            primary: {
                backgroundColor: colors.primaryDark,
                transform: [{ scale: 0.98 }],
            },
            secondary: {
                backgroundColor: colors.backgroundTertiary,
                transform: [{ scale: 0.98 }],
            },
            outline: {
                backgroundColor: `${colors.primary}10`,
                transform: [{ scale: 0.98 }],
            },
            ghost: {
                backgroundColor: `${colors.primary}10`,
                transform: [{ scale: 0.98 }],
            },
            danger: {
                backgroundColor: '#DC2626',
                transform: [{ scale: 0.98 }],
            },
            success: {
                backgroundColor: '#059669',
                transform: [{ scale: 0.98 }],
            },
        };

        return pressedVariants[variant];
    };

    const baseContainerStyle: ViewStyle = {
        paddingHorizontal: config.paddingHorizontal,
        paddingVertical: config.paddingVertical,
        minHeight: config.minHeight,
        borderRadius: config.borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
        ...(fullWidth && { width: '100%' }),
        ...(isDisabled && {
            opacity: 0.6,
            shadowOpacity: 0,
            elevation: 0,
        }),
    };

    const baseTextStyle: TextStyle = {
        fontSize: config.typography.fontSize,
        lineHeight: config.typography.lineHeight,
        fontWeight: '600',
        textAlign: 'center',
        ...(isDisabled && { color: colors.disabled }),
    };

    const variantStyles = getVariantStyles();
    const pressedStyles = getPressedStyles();

    const createPressableStyle = ({ pressed }: PressableStateCallbackType): ViewStyle | ViewStyle[] => {
        const styles = [
            baseContainerStyle,
            variantStyles.container,
        ];

        if (Array.isArray(style)) {
            styles.push(...style);
        } else if (style) {
            styles.push(style);
        }

        if (pressed && !isDisabled) {
            styles.push(pressedStyles);
        }

        return styles;
    };

    const finalTextStyle: TextStyle = {
        ...baseTextStyle,
        ...variantStyles.text,
        ...textStyle,
    };

    const renderContent = () => {
        if (loading) {
            return (
                <>
                    <ActivityIndicator
                        size="small"
                        color={variantStyles.text.color}
                    />
                    <Text style={finalTextStyle}>Loading...</Text>
                </>
            );
        }

        const iconElement = icon && (
            <View style={{ opacity: isDisabled ? 0.5 : 1 }}>
                {icon}
            </View>
        );

        const textElement = (
            <Text style={finalTextStyle} numberOfLines={1}>
                {text}
            </Text>
        );

        if (iconPosition === 'right') {
            return (
                <>
                    {textElement}
                    {iconElement}
                </>
            );
        }

        return (
            <>
                {iconElement}
                {textElement}
            </>
        );
    };

    return (
        <Pressable
            {...props}
            disabled={isDisabled}
            style={createPressableStyle}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
        >
            {renderContent()}
        </Pressable>
    );
}