// src/components/CustomInput.tsx
import React, { useState, useRef } from 'react';
import {
    TextInput,
    Text,
    View,
    TouchableOpacity,
    Animated,
    ViewStyle,
    TextStyle,
    TextInputProps,
} from 'react-native';
import { Control, Controller, FieldValues, Path, FieldError } from 'react-hook-form';
import { useTheme, spacing, borderRadius, typography } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

type InputVariant = 'default' | 'filled' | 'outline';
type InputSize = 'sm' | 'md' | 'lg';

interface CustomInputProps<T extends FieldValues> extends Omit<TextInputProps, 'style'> {
    control: Control<T>;
    name: Path<T>;
    label?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: InputVariant;
    size?: InputSize;
    showPasswordToggle?: boolean;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    labelStyle?: TextStyle;
    errorStyle?: TextStyle;
    helperStyle?: TextStyle;
}

const sizeConfig = {
    sm: {
        minHeight: 36,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        fontSize: typography.sm.fontSize,
        iconSize: 16,
    },
    md: {
        minHeight: 44,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        fontSize: typography.base.fontSize,
        iconSize: 20,
    },
    lg: {
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
        fontSize: typography.lg.fontSize,
        iconSize: 24,
    },
} as const;

export default function CustomInput<T extends FieldValues>({
                                                               control,
                                                               name,
                                                               label,
                                                               helperText,
                                                               leftIcon,
                                                               rightIcon,
                                                               variant = 'default',
                                                               size = 'md',
                                                               showPasswordToggle = false,
                                                               secureTextEntry,
                                                               containerStyle,
                                                               inputStyle,
                                                               labelStyle,
                                                               errorStyle,
                                                               helperStyle,
                                                               ...props
                                                           }: CustomInputProps<T>) {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;
    const config = sizeConfig[size];

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(focusAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        Animated.timing(focusAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const getVariantStyles = (hasError: boolean, hasValue: boolean) => {
        const borderColor = focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [
                hasError ? colors.error : colors.border,
                hasError ? colors.error : colors.borderFocus,
            ],
        });

        const variants = {
            default: {
                container: {
                    borderWidth: 1,
                    borderColor: borderColor,
                    backgroundColor: colors.surface,
                },
                input: {},
            },
            filled: {
                container: {
                    borderWidth: 0,
                    backgroundColor: colors.backgroundTertiary,
                    borderBottomWidth: 2,
                    borderBottomColor: borderColor,
                    borderRadius: 0,
                    borderTopLeftRadius: config.borderRadius,
                    borderTopRightRadius: config.borderRadius,
                },
                input: {},
            },
            outline: {
                container: {
                    borderWidth: 2,
                    borderColor: borderColor,
                    backgroundColor: 'transparent',
                },
                input: {},
            },
        };

        return variants[variant];
    };

    const renderPasswordToggle = () => {
        if (!showPasswordToggle && !secureTextEntry) return null;

        return (
            <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={{
                    padding: spacing.xs,
                    borderRadius: borderRadius.sm,
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons
                    name={isPasswordVisible ? 'eye-off' : 'eye'}
                    size={config.iconSize}
                    color={colors.textTertiary}
                />
            </TouchableOpacity>
        );
    };

    const renderLabel = () => {
        if (!label) return null;

        const animatedLabelStyle: TextStyle = {
            position: 'absolute',
            left: leftIcon ? config.iconSize + spacing.md * 2 : spacing.md,
            fontSize: focusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [config.fontSize, typography.sm.fontSize],
            }),
            top: focusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [config.minHeight / 2 - config.fontSize / 2, -typography.sm.fontSize / 2],
            }),
            color: colors.textSecondary,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.xs,
            zIndex: 1,
            ...labelStyle,
        };

        return (
            <Animated.Text style={animatedLabelStyle}>
                {label}
            </Animated.Text>
        );
    };

    const renderError = (error: FieldError | undefined) => {
        if (!error) return null;

        return (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.xs,
                gap: spacing.xs,
            }}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={{
                    fontSize: typography.sm.fontSize,
                    color: colors.error,
                    flex: 1,
                    lineHeight: typography.sm.lineHeight,
                    ...errorStyle,
                }}>
                    {error.message}
                </Text>
            </View>
        );
    };

    const renderHelperText = () => {
        if (!helperText) return null;

        return (
            <Text style={{
                fontSize: typography.sm.fontSize,
                color: colors.textSecondary,
                marginTop: spacing.xs,
                lineHeight: typography.sm.lineHeight,
                ...helperStyle,
            }}>
                {helperText}
            </Text>
        );
    };

    return (
        <Controller
            control={control}
            name={name}
            render={({
                         field: { value, onChange, onBlur },
                         fieldState: { error },
                     }) => {
                const hasError = !!error;
                const hasValue = !!value;
                const variantStyles = getVariantStyles(hasError, hasValue);

                const baseContainerStyle: ViewStyle = {
                    marginBottom: spacing.sm,
                    ...containerStyle,
                };

                const inputContainerStyle: ViewStyle = {
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: config.minHeight,
                    paddingHorizontal: config.paddingHorizontal,
                    borderRadius: config.borderRadius,
                    position: 'relative',
                    ...variantStyles.container,
                };

                const textInputStyle: TextStyle = {
                    flex: 1,
                    fontSize: config.fontSize,
                    color: colors.text,
                    paddingVertical: config.paddingVertical,
                    paddingHorizontal: leftIcon || rightIcon ? spacing.xs : 0,
                    ...variantStyles.input,
                    ...inputStyle,
                };

                return (
                    <View style={baseContainerStyle}>
                        {variant !== 'filled' && renderLabel()}

                        <Animated.View style={inputContainerStyle}>
                            {leftIcon && (
                                <View style={{
                                    marginRight: spacing.xs,
                                    opacity: 0.7,
                                }}>
                                    {leftIcon}
                                </View>
                            )}

                            <TextInput
                                {...props}
                                value={value}
                                onChangeText={onChange}
                                onBlur={(e) => {
                                    onBlur();
                                    handleBlur();
                                    props.onBlur?.(e);
                                }}
                                onFocus={(e) => {
                                    handleFocus();
                                    props.onFocus?.(e);
                                }}
                                style={textInputStyle}
                                placeholderTextColor={colors.placeholder}
                                secureTextEntry={secureTextEntry && !isPasswordVisible}
                                selectionColor={colors.primary}
                            />

                            {rightIcon && !showPasswordToggle && (
                                <View style={{
                                    marginLeft: spacing.xs,
                                    opacity: 0.7,
                                }}>
                                    {rightIcon}
                                </View>
                            )}

                            {renderPasswordToggle()}
                        </Animated.View>

                        {variant === 'filled' && renderLabel()}
                        {renderError(error)}
                        {!error && renderHelperText()}
                    </View>
                );
            }}
        />
    );
}