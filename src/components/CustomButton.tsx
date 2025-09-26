// src/components/CustomButton.tsx
import React from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    PressableProps,
    ViewStyle,
    TextStyle,
    PressableStateCallbackType
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'small' | 'medium' | 'large';

type CustomButtonProps = {
    text: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    icon?: React.ReactNode;
} & Omit<PressableProps, 'style'> & {
    style?: ViewStyle | ViewStyle[];
};

export default function CustomButton({
                                         text,
                                         variant = 'primary',
                                         size = 'medium',
                                         fullWidth = false,
                                         disabled,
                                         style,
                                         icon,
                                         ...props
                                     }: CustomButtonProps) {
    const { colors, isDark } = useTheme();

    const getButtonStyle = (): ViewStyle => {
        const baseStyle: ViewStyle = {
            borderRadius: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: icon ? 8 : 0,
            borderWidth: variant === 'outline' ? 2 : 0,
            shadowColor: colors.shadow,
            shadowOffset: {
                width: 0,
                height: variant === 'ghost' ? 0 : 2,
            },
            shadowOpacity: variant === 'ghost' ? 0 : 0.1,
            shadowRadius: variant === 'ghost' ? 0 : 4,
            elevation: variant === 'ghost' ? 0 : 2,
        };

        // Size-specific styles
        const sizeStyles: Record<ButtonSize, ViewStyle> = {
            small: {
                paddingHorizontal: 12,
                paddingVertical: 8,
                minHeight: 32,
            },
            medium: {
                paddingHorizontal: 16,
                paddingVertical: 12,
                minHeight: 44,
            },
            large: {
                paddingHorizontal: 20,
                paddingVertical: 16,
                minHeight: 52,
            },
        };

        // Variant-specific styles
        const variantStyles: Record<ButtonVariant, ViewStyle> = {
            primary: {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
            },
            secondary: {
                backgroundColor: colors.surface,
                borderColor: colors.border,
            },
            outline: {
                backgroundColor: 'transparent',
                borderColor: colors.primary,
            },
            ghost: {
                backgroundColor: 'transparent',
                borderColor: 'transparent',
            },
            danger: {
                backgroundColor: colors.error,
                borderColor: colors.error,
            },
            success: {
                backgroundColor: colors.success,
                borderColor: colors.success,
            },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            ...(fullWidth && { width: '100%' }),
            ...(disabled && {
                opacity: 0.6,
                shadowOpacity: 0,
                elevation: 0,
            }),
        };
    };

    const getTextStyle = (): TextStyle => {
        const baseStyle: TextStyle = {
            fontWeight: '600',
            textAlign: 'center',
        };

        // Size-specific text styles
        const sizeStyles: Record<ButtonSize, TextStyle> = {
            small: { fontSize: 14 },
            medium: { fontSize: 16 },
            large: { fontSize: 18 },
        };

        // Variant-specific text styles
        const variantStyles: Record<ButtonVariant, TextStyle> = {
            primary: { color: '#FFFFFF' },
            secondary: { color: colors.text },
            outline: { color: colors.primary },
            ghost: { color: colors.primary },
            danger: { color: '#FFFFFF' },
            success: { color: '#FFFFFF' },
        };

        return {
            ...baseStyle,
            ...sizeStyles[size],
            ...variantStyles[variant],
            ...(disabled && { color: colors.textTertiary }),
        };
    };

    const getPressedStyle = (): ViewStyle => {
        const variantPressed: Record<ButtonVariant, ViewStyle> = {
            primary: { backgroundColor: colors.primaryDark },
            secondary: { backgroundColor: colors.backgroundTertiary },
            outline: { backgroundColor: `${colors.primary}10` },
            ghost: { backgroundColor: `${colors.primary}10` },
            danger: { backgroundColor: '#DC2626' },
            success: { backgroundColor: '#059669' },
        };

        return {
            transform: [{ scale: 0.98 }],
            ...variantPressed[variant],
        };

    };

    const buttonStyle = getButtonStyle();
    const textStyle = getTextStyle();
    const pressedStyle = getPressedStyle();

    // Create the style function for Pressable
    const createPressableStyle = ({ pressed }: PressableStateCallbackType): ViewStyle | ViewStyle[] => {
        const baseStyles = [buttonStyle];

        if (Array.isArray(style)) {
            baseStyles.push(...style);
        } else if (style) {
            baseStyles.push(style);
        }

        if (pressed && !disabled) {
            baseStyles.push(pressedStyle);
        }

        return baseStyles;
    };

    return (
        <Pressable
            {...props}
            disabled={disabled}
            style={createPressableStyle}
        >
            {icon}
            <Text style={textStyle}>{text}</Text>
        </Pressable>
    );
}