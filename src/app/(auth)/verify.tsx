// src/app/(auth)/verify.tsx
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    KeyboardAvoidingView,
    Platform,
    View,
    Alert,
    ViewStyle,
    TextStyle,
} from 'react-native';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isClerkAPIResponseError, useSignUp } from '@clerk/clerk-expo';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const verifySchema = z.object({
    code: z.string({ message: 'Code is required' }).length(6, 'Invalid code'),
});

type VerifyFields = z.infer<typeof verifySchema>;

const mapClerkErrorToFormField = (error: any) => {
    switch (error.meta?.paramName) {
        case 'code':
            return 'code';
        default:
            return 'root';
    }
};

export default function VerifyScreen() {
    const { colors, isDark } = useTheme();
    const [resendLoading, setResendLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<VerifyFields>({
        resolver: zodResolver(verifySchema),
    });

    const { signUp, isLoaded, setActive } = useSignUp();

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const onVerify = async ({ code }: VerifyFields) => {
        if (!isLoaded) return;

        try {
            const signUpAttempt = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (signUpAttempt.status === 'complete') {
                setActive({ session: signUpAttempt.createdSessionId });
            } else {
                console.log('Verification failed');
                console.log(signUpAttempt);
                setError('root', { message: 'Could not complete the sign up' });
            }
        } catch (err) {
            if (isClerkAPIResponseError(err)) {
                err.errors.forEach((error) => {
                    const fieldName = mapClerkErrorToFormField(error);
                    setError(fieldName, {
                        message: error.longMessage,
                    });
                });
            } else {
                setError('root', { message: 'Unknown error' });
            }
        }
    };

    const handleResendCode = async () => {
        if (!isLoaded || countdown > 0) return;

        try {
            setResendLoading(true);
            await signUp.prepareVerification({ strategy: 'email_code' });
            setCountdown(60); // 60 second cooldown
            Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
        } catch (error) {
            Alert.alert('Error', 'Failed to resend verification code. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        padding: 20,
        paddingTop: Platform.select({ ios: 60, android: 40 }),
    };

    const headerSectionStyle: ViewStyle = {
        alignItems: 'center',
        marginBottom: 40,
    };

    const iconContainerStyle: ViewStyle = {
        width: 80,
        height: 80,
        backgroundColor: colors.primary,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    };

    const titleStyle: TextStyle = {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    };

    const subtitleStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    };

    const emailStyle: TextStyle = {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
        textAlign: 'center',
    };

    const formStyle: ViewStyle = {
        marginBottom: 24,
    };

    const errorContainerStyle: ViewStyle = {
        backgroundColor: colors.errorBackground,
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    };

    const errorTextStyle: TextStyle = {
        color: colors.error,
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
    };

    const resendSectionStyle: ViewStyle = {
        alignItems: 'center',
        marginTop: 24,
        padding: 16,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const resendTextStyle: TextStyle = {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
        textAlign: 'center',
    };

    const countdownTextStyle: TextStyle = {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 8,
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={containerStyle}
        >
            {/* Header Section */}
            <View style={headerSectionStyle}>
                <View style={iconContainerStyle}>
                    <Ionicons name="mail" size={40} color="#FFFFFF" />
                </View>
                <Text style={titleStyle}>Verify Your Email</Text>
                <Text style={subtitleStyle}>
                    We've sent a 6-digit verification code to
                </Text>
                <Text style={emailStyle}>
                    {signUp?.emailAddress || 'your email address'}
                </Text>
            </View>

            {/* Form Section */}
            <View style={formStyle}>
                <CustomInput
                    control={control}
                    name='code'
                    label='Verification Code'
                    placeholder='Enter 6-digit code'
                    autoFocus
                    autoCapitalize='none'
                    keyboardType='number-pad'
                    autoComplete='one-time-code'
                    leftIcon={<Ionicons name="keypad" size={20} color={colors.textTertiary} />}
                    helperText="Check your email for the verification code"
                />

                {errors.root && (
                    <View style={errorContainerStyle}>
                        <Ionicons name="alert-circle" size={20} color={colors.error} />
                        <Text style={errorTextStyle}>{errors.root.message}</Text>
                    </View>
                )}
            </View>

            {/* Verify Button */}
            <CustomButton
                text='Verify Email'
                onPress={handleSubmit(onVerify)}
                fullWidth
                size="large"
            />

            {/* Resend Section */}
            <View style={resendSectionStyle}>
                <Text style={resendTextStyle}>
                    Didn't receive the code? Check your spam folder or request a new one.
                </Text>

                <CustomButton
                    text={countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                    variant="outline"
                    size="medium"
                    disabled={countdown > 0 || resendLoading}
                    onPress={handleResendCode}
                    icon={
                        resendLoading ? (
                            <Ionicons name="refresh" size={16} color={colors.primary} />
                        ) : (
                            <Ionicons name="mail" size={16} color={colors.primary} />
                        )
                    }
                />

                {countdown > 0 && (
                    <Text style={countdownTextStyle}>
                        You can request a new code in {countdown} seconds
                    </Text>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}