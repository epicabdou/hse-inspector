// src/app/(auth)/sign-in.tsx
import React, { useRef, useEffect } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View,
    Text,
    Animated,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { isClerkAPIResponseError, useSignIn } from '@clerk/clerk-expo';
import { useTheme, spacing, borderRadius, typography, shadows } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import SignInWith from '@/components/SignInWith';

const signInSchema = z.object({
    email: z.string({ message: 'Email is required' }).email('Invalid email'),
    password: z
        .string({ message: 'Password is required' })
        .min(8, 'Password should be at least 8 characters long'),
});

type SignInFields = z.infer<typeof signInSchema>;

const mapClerkErrorToFormField = (error: any) => {
    switch (error.meta?.paramName) {
        case 'identifier':
            return 'email';
        case 'password':
            return 'password';
        default:
            return 'root';
    }
};

export default function SignInScreen() {
    const { colors } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<SignInFields>({
        resolver: zodResolver(signInSchema),
    });

    const { signIn, isLoaded, setActive } = useSignIn();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const onSignIn = async (data: SignInFields) => {
        if (!isLoaded) return;

        try {
            const signInAttempt = await signIn.create({
                identifier: data.email,
                password: data.password,
            });

            if (signInAttempt.status === 'complete') {
                setActive({ session: signInAttempt.createdSessionId });
            } else {
                setError('root', { message: 'Sign in could not be completed' });
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
                setError('root', { message: 'Unknown error occurred' });
            }
        }
    };

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
    };

    const scrollContentStyle: ViewStyle = {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: Platform.select({ ios: 60, android: 40 }),
        paddingBottom: spacing.xl,
    };

    const cardStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        padding: spacing.xl,
        ...shadows.lg,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const headerStyle: ViewStyle = {
        alignItems: 'center',
        marginBottom: spacing.xl,
    };

    const logoStyle: ViewStyle = {
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

    const titleStyle: TextStyle = {
        fontSize: typography['3xl'].fontSize,
        lineHeight: typography['3xl'].lineHeight,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    };

    const subtitleStyle: TextStyle = {
        fontSize: typography.lg.fontSize,
        lineHeight: typography.lg.lineHeight,
        color: colors.textSecondary,
        textAlign: 'center',
    };

    const formStyle: ViewStyle = {
        gap: spacing.md,
        marginBottom: spacing.lg,
    };

    const errorStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorBackground,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.error,
    };

    const errorTextStyle: TextStyle = {
        color: colors.error,
        fontSize: typography.sm.fontSize,
        flex: 1,
        lineHeight: typography.sm.lineHeight,
    };

    const linkStyle: TextStyle = {
        color: colors.primary,
        fontWeight: '600',
        fontSize: typography.base.fontSize,
        textAlign: 'center',
        marginVertical: spacing.lg,
    };

    const dividerStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    };

    const dividerLineStyle: ViewStyle = {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    };

    const dividerTextStyle: TextStyle = {
        marginHorizontal: spacing.md,
        fontSize: typography.sm.fontSize,
        color: colors.textSecondary,
        fontWeight: '500',
    };

    const socialButtonsStyle: ViewStyle = {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={containerStyle}
        >
            <ScrollView
                contentContainerStyle={scrollContentStyle}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        cardStyle,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={headerStyle}>
                        <View style={logoStyle}>
                            <Text style={logoTextStyle}>HSE</Text>
                        </View>
                        <Text style={titleStyle}>Welcome Back</Text>
                        <Text style={subtitleStyle}>
                            Sign in to continue your safety inspections
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={formStyle}>
                        <CustomInput
                            control={control}
                            name="email"
                            label="Email Address"
                            placeholder="Enter your email"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            leftIcon={
                                <Ionicons name="mail" size={20} color={colors.textTertiary} />
                            }
                        />

                        <CustomInput
                            control={control}
                            name="password"
                            label="Password"
                            placeholder="Enter your password"
                            secureTextEntry
                            showPasswordToggle
                            leftIcon={
                                <Ionicons name="lock-closed" size={20} color={colors.textTertiary} />
                            }
                        />

                        {errors.root && (
                            <View style={errorStyle}>
                                <Ionicons name="alert-circle" size={20} color={colors.error} />
                                <Text style={errorTextStyle}>{errors.root.message}</Text>
                            </View>
                        )}
                    </View>

                    {/* Sign In Button */}
                    <CustomButton
                        text="Sign In"
                        onPress={handleSubmit(onSignIn)}
                        loading={isSubmitting}
                        fullWidth
                        size="lg"
                    />

                    {/* Sign Up Link */}
                    <Link href="/sign-up" style={linkStyle}>
                        Don't have an account? Create one
                    </Link>

                    {/* Divider */}
                    <View style={dividerStyle}>
                        <View style={dividerLineStyle} />
                        <Text style={dividerTextStyle}>OR</Text>
                        <View style={dividerLineStyle} />
                    </View>

                    {/* Social Sign In */}
                    <View style={socialButtonsStyle}>
                        <SignInWith strategy="oauth_google" />
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}