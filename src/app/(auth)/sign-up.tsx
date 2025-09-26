// src/app/(auth)/sign-up.tsx
import React from 'react';
import {
    StyleSheet,
    Text,
    KeyboardAvoidingView,
    Platform,
    View,
    ScrollView,
    ViewStyle,
    TextStyle,
} from 'react-native';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { isClerkAPIResponseError, useSignUp } from '@clerk/clerk-expo';
import SignInWith from '@/components/SignInWith';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const signUpSchema = z.object({
    email: z.string({ message: 'Email is required' }).email('Invalid email'),
    password: z
        .string({ message: 'Password is required' })
        .min(8, 'Password should be at least 8 characters long'),
});

type SignUpFields = z.infer<typeof signUpSchema>;

const mapClerkErrorToFormField = (error: any) => {
    switch (error.meta?.paramName) {
        case 'email_address':
            return 'email';
        case 'password':
            return 'password';
        default:
            return 'root';
    }
};

export default function SignUpScreen() {
    const { colors, isDark } = useTheme();
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<SignUpFields>({
        resolver: zodResolver(signUpSchema),
    });

    const { signUp, isLoaded } = useSignUp();

    const onSignUp = async (data: SignUpFields) => {
        if (!isLoaded) return;

        try {
            await signUp.create({
                emailAddress: data.email,
                password: data.password,
            });

            await signUp.prepareVerification({ strategy: 'email_code' });

            router.push('/verify');
        } catch (err) {
            console.log('Sign up error: ', err);
            if (isClerkAPIResponseError(err)) {
                err.errors.forEach((error) => {
                    console.log('Error: ', JSON.stringify(error, null, 2));
                    const fieldName = mapClerkErrorToFormField(error);
                    console.log('Field name: ', fieldName);
                    setError(fieldName, {
                        message: error.longMessage,
                    });
                });
            } else {
                setError('root', { message: 'Unknown error' });
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
        padding: 20,
        paddingTop: Platform.select({ ios: 60, android: 40 }),
    };

    const headerSectionStyle: ViewStyle = {
        alignItems: 'center',
        marginBottom: 40,
    };

    const logoContainerStyle: ViewStyle = {
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

    const logoTextStyle: TextStyle = {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 1,
    };

    const titleStyle: TextStyle = {
        fontSize: 32,
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

    const linkStyle: TextStyle = {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 16,
    };

    const dividerStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    };

    const dividerLineStyle: ViewStyle = {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    };

    const dividerTextStyle: TextStyle = {
        marginHorizontal: 16,
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    };

    const socialButtonsStyle: ViewStyle = {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 16,
    };

    const termsStyle: ViewStyle = {
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const termsTextStyle: TextStyle = {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
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
                {/* Header Section */}
                <View style={headerSectionStyle}>
                    <View style={logoContainerStyle}>
                        <Text style={logoTextStyle}>HSE</Text>
                    </View>
                    <Text style={titleStyle}>Create Account</Text>
                    <Text style={subtitleStyle}>
                        Join us to start your safety inspections journey
                    </Text>
                </View>

                {/* Form Section */}
                <View style={formStyle}>
                    <CustomInput
                        control={control}
                        name='email'
                        label='Email Address'
                        placeholder='Enter your email'
                        autoFocus
                        autoCapitalize='none'
                        keyboardType='email-address'
                        autoComplete='email'
                        leftIcon={<Ionicons name="mail" size={20} color={colors.textTertiary} />}
                    />

                    <CustomInput
                        control={control}
                        name='password'
                        label='Password'
                        placeholder='Create a strong password'
                        secureTextEntry
                        leftIcon={<Ionicons name="lock-closed" size={20} color={colors.textTertiary} />}
                        helperText="Password must be at least 8 characters long"
                    />

                    {errors.root && (
                        <View style={errorContainerStyle}>
                            <Ionicons name="alert-circle" size={20} color={colors.error} />
                            <Text style={errorTextStyle}>{errors.root.message}</Text>
                        </View>
                    )}
                </View>

                {/* Terms */}
                <View style={termsStyle}>
                    <Text style={termsTextStyle}>
                        By creating an account, you agree to our Terms of Service and Privacy Policy.
                        Your data will be used to provide safety inspection services.
                    </Text>
                </View>

                {/* Sign Up Button */}
                <CustomButton
                    text='Create Account'
                    onPress={handleSubmit(onSignUp)}
                    fullWidth
                    size="large"
                />

                {/* Sign In Link */}
                <Link href='/sign-in' style={linkStyle}>
                    Already have an account? Sign in
                </Link>

                {/* Divider */}
                <View style={dividerStyle}>
                    <View style={dividerLineStyle} />
                    <Text style={dividerTextStyle}>OR</Text>
                    <View style={dividerLineStyle} />
                </View>

                {/* Social Sign Up */}
                <View style={socialButtonsStyle}>
                    <SignInWith strategy='oauth_google' />
                    <SignInWith strategy='oauth_facebook' />
                    <SignInWith strategy='oauth_apple' />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}