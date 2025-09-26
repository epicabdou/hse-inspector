// src/app/(protected)/(tabs)/settings.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Switch,
    TouchableOpacity,
    Alert,
    Platform,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
                                                     icon,
                                                     title,
                                                     subtitle,
                                                     onPress,
                                                     rightElement,
                                                     danger = false,
                                                 }) => {
    const { colors } = useTheme();

    const itemStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const iconContainerStyle: ViewStyle = {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: danger ? colors.errorBackground : colors.backgroundTertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    };

    const contentStyle: ViewStyle = {
        flex: 1,
    };

    const titleStyle: TextStyle = {
        fontSize: 16,
        fontWeight: '600',
        color: danger ? colors.error : colors.text,
        marginBottom: subtitle ? 2 : 0,
    };

    const subtitleStyle: TextStyle = {
        fontSize: 14,
        color: colors.textSecondary,
    };

    return (
        <TouchableOpacity
            style={itemStyle}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={iconContainerStyle}>
                <Ionicons
                    name={icon as any}
                    size={20}
                    color={danger ? colors.error : colors.primary}
                />
            </View>

            <View style={contentStyle}>
                <Text style={titleStyle}>{title}</Text>
                {subtitle && <Text style={subtitleStyle}>{subtitle}</Text>}
            </View>

            {rightElement && rightElement}

            {onPress && !rightElement && (
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
        </TouchableOpacity>
    );
};

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
    const { colors } = useTheme();

    const sectionStyle: ViewStyle = {
        marginBottom: 24,
    };

    const titleStyle: TextStyle = {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        paddingHorizontal: 4,
    };

    return (
        <View style={sectionStyle}>
            <Text style={titleStyle}>{title}</Text>
            {children}
        </View>
    );
};

export default function SettingsScreen() {
    const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
    const { signOut, user } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
    };

    const scrollContentStyle: ViewStyle = {
        paddingTop: Platform.select({ ios: 0, android: 16 }),
        paddingHorizontal: 16,
        paddingBottom: 80,
    };

    const headerStyle: ViewStyle = {
        marginBottom: 32,
    };

    const headerTitleStyle: TextStyle = {
        fontSize: 32,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
    };

    const headerSubtitleStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
    };

    const themeOptionsStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const themeOptionStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    };

    const themeOptionTextStyle: TextStyle = {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace('/sign-in');
                        } catch (error) {
                            console.error('Sign out error:', error);
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleThemeSelect = (mode: ThemeMode) => {
        setThemeMode(mode);
    };

    const getThemeIcon = (mode: ThemeMode) => {
        switch (mode) {
            case 'light': return 'sunny';
            case 'dark': return 'moon';
            case 'system': return 'phone-portrait';
            default: return 'phone-portrait';
        }
    };

    const getThemeDescription = (mode: ThemeMode) => {
        switch (mode) {
            case 'light': return 'Always use light theme';
            case 'dark': return 'Always use dark theme';
            case 'system': return 'Follow system setting';
            default: return 'Follow system setting';
        }
    };

    return (
        <ScrollView style={containerStyle} contentContainerStyle={scrollContentStyle}>
            {/* Header */}
            <View style={headerStyle}>
                <Text style={headerTitleStyle}>Settings</Text>
                <Text style={headerSubtitleStyle}>
                    Customize your app experience
                </Text>
            </View>

            {/* Account Section */}
            <Section title="Account">
                <SettingItem
                    icon="person-circle"
                    title={user?.emailAddresses?.[0]?.emailAddress || 'Profile'}
                    subtitle="Manage your account settings"
                    onPress={() => {
                        Alert.alert('Profile', 'Profile management coming soon!');
                    }}
                />
            </Section>

            {/* Appearance Section */}
            <Section title="Appearance">
                <View style={themeOptionsStyle}>
                    {(['system', 'light', 'dark'] as ThemeMode[]).map((mode, index) => (
                        <TouchableOpacity
                            key={mode}
                            style={[
                                themeOptionStyle,
                                index === 2 && { borderBottomWidth: 0 },
                            ]}
                            onPress={() => handleThemeSelect(mode)}
                        >
                            <View style={{ marginRight: 12 }}>
                                <Ionicons
                                    name={getThemeIcon(mode) as any}
                                    size={20}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={themeOptionTextStyle}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </Text>
                                <Text style={[{ fontSize: 12, marginTop: 2, color: colors.textSecondary }]}>
                                    {getThemeDescription(mode)}
                                </Text>
                            </View>
                            {themeMode === mode && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Section>

            {/* Preferences Section */}
            <Section title="Preferences">
                <SettingItem
                    icon="notifications"
                    title="Push Notifications"
                    subtitle="Receive alerts for new analysis results"
                    rightElement={
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                            ios_backgroundColor={colors.border}
                        />
                    }
                />

                <SettingItem
                    icon="analytics"
                    title="Analytics"
                    subtitle="Help improve the app with usage data"
                    rightElement={
                        <Switch
                            value={analyticsEnabled}
                            onValueChange={setAnalyticsEnabled}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                            ios_backgroundColor={colors.border}
                        />
                    }
                />

                <SettingItem
                    icon="document-text"
                    title="Export Data"
                    subtitle="Download your inspection history"
                    onPress={() => {
                        Alert.alert('Export Data', 'Data export feature coming soon!');
                    }}
                />
            </Section>

            {/* Support Section */}
            <Section title="Support">
                <SettingItem
                    icon="help-circle"
                    title="Help & Support"
                    subtitle="Get help or contact support"
                    onPress={() => {
                        Alert.alert('Support', 'Support page coming soon!');
                    }}
                />

                <SettingItem
                    icon="information-circle"
                    title="About"
                    subtitle="App version and information"
                    onPress={() => {
                        Alert.alert(
                            'About HSE Inspector',
                            'Version 1.0.0\n\nAI-powered safety inspection and hazard detection app.',
                            [{ text: 'OK' }]
                        );
                    }}
                />

                <SettingItem
                    icon="star"
                    title="Rate App"
                    subtitle="Leave a review on the app store"
                    onPress={() => {
                        Alert.alert('Rate App', 'Thank you for using our app!');
                    }}
                />
            </Section>

            {/* Account Actions */}
            <Section title="Account Actions">
                <SettingItem
                    icon="log-out"
                    title="Sign Out"
                    subtitle="Sign out of your account"
                    onPress={handleSignOut}
                    danger
                />
            </Section>

        </ScrollView>
    );
}