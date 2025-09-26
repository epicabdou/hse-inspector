import { Pressable, Text, StyleSheet, PressableProps, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

type CustomButtonProps = {
    text: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
} & PressableProps;

export default function CustomButton({
                                         text,
                                         variant = 'primary',
                                         size = 'medium',
                                         fullWidth = false,
                                         disabled,
                                         style,
                                         ...props
                                     }: CustomButtonProps) {

    const getButtonStyle = (): ViewStyle => {
        const baseStyle = [
            styles.button,
            styles[`${variant}Button`],
            styles[`${size}Button`],
            fullWidth && styles.fullWidth,
            disabled && styles.disabled,
        ];

        return StyleSheet.flatten([baseStyle, style]) as ViewStyle;
    };

    const getTextStyle = () => [
        styles.buttonText,
        styles[`${variant}Text`],
        styles[`${size}Text`],
        disabled && styles.disabledText,
    ];

    return (
        <Pressable
            {...props}
            disabled={disabled}
            style={({ pressed }) => [
                getButtonStyle(),
                pressed && !disabled && styles.pressed,
                pressed && !disabled && styles[`${variant}Pressed`],
            ]}
        >
            <Text style={getTextStyle()}>{text}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // Base button styles
    button: {
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },

    // Size variants
    smallButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 32,
    },
    mediumButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
    },
    largeButton: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        minHeight: 52,
    },

    // Full width
    fullWidth: {
        width: '100%',
    },

    // Color variants
    primaryButton: {
        backgroundColor: '#4353FD',
    },
    secondaryButton: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderColor: '#4353FD',
    },
    ghostButton: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    dangerButton: {
        backgroundColor: '#EF4444',
    },

    // Base text styles
    buttonText: {
        fontWeight: '600',
        textAlign: 'center',
    },

    // Text size variants
    smallText: {
        fontSize: 14,
    },
    mediumText: {
        fontSize: 16,
    },
    largeText: {
        fontSize: 18,
    },

    // Text color variants
    primaryText: {
        color: '#FFFFFF',
    },
    secondaryText: {
        color: '#475569',
    },
    outlineText: {
        color: '#4353FD',
    },
    ghostText: {
        color: '#4353FD',
    },
    dangerText: {
        color: '#FFFFFF',
    },

    // Pressed states
    pressed: {
        transform: [{ scale: 0.98 }],
    },
    primaryPressed: {
        backgroundColor: '#3B47E6',
    },
    secondaryPressed: {
        backgroundColor: '#E2E8F0',
    },
    outlinePressed: {
        backgroundColor: '#F0F4FF',
    },
    ghostPressed: {
        backgroundColor: '#F0F4FF',
    },
    dangerPressed: {
        backgroundColor: '#DC2626',
    },

    // Disabled states
    disabled: {
        opacity: 0.6,
        shadowOpacity: 0,
        elevation: 0,
    },
    disabledText: {
        color: '#94A3B8',
    },
});