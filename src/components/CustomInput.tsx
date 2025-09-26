// src/components/CustomInput.tsx
import React from 'react';
import {
    TextInput,
    StyleSheet,
    TextInputProps,
    Text,
    View,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useTheme } from '@/contexts/ThemeContext';

type CustomInputProps<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
    label?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
} & TextInputProps;

export default function CustomInput<T extends FieldValues>({
                                                               control,
                                                               name,
                                                               label,
                                                               helperText,
                                                               leftIcon,
                                                               rightIcon,
                                                               style,
                                                               ...props
                                                           }: CustomInputProps<T>) {
    const { colors, isDark } = useTheme();

    const containerStyle: ViewStyle = {
        marginBottom: 4,
    };

    const labelStyle: TextStyle = {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    };

    const inputContainerStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        minHeight: 48,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    };

    const inputStyle: TextStyle = {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        paddingVertical: 12,
        paddingHorizontal: leftIcon || rightIcon ? 8 : 0,
    };

    const helperTextStyle: TextStyle = {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        minHeight: 16,
    };

    const errorTextStyle: TextStyle = {
        fontSize: 12,
        color: colors.error,
        marginTop: 4,
        minHeight: 16,
    };

    const iconStyle: ViewStyle = {
        opacity: 0.7,
    };

    return (
        <Controller
            control={control}
            name={name}
            render={({
                         field: { value, onChange, onBlur },
                         fieldState: { error },
                     }) => (
                <View style={containerStyle}>
                    {label && <Text style={labelStyle}>{label}</Text>}

                    <View style={[
                        inputContainerStyle,
                        {
                            borderColor: error ? colors.error : colors.border,
                        },
                        ...(error ? [{
                            shadowColor: colors.error,
                            shadowOpacity: 0.1,
                        }] : []),
                    ]}>
                        {leftIcon && <View style={iconStyle}>{leftIcon}</View>}

                        <TextInput
                            {...props}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            style={[inputStyle, style]}
                            placeholderTextColor={colors.textTertiary}
                        />

                        {rightIcon && <View style={iconStyle}>{rightIcon}</View>}
                    </View>

                    {error ? (
                        <Text style={errorTextStyle}>{error.message}</Text>
                    ) : helperText ? (
                        <Text style={helperTextStyle}>{helperText}</Text>
                    ) : (
                        <View style={{ height: 16 }} />
                    )}
                </View>
            )}
        />
    );
}