// src/app/(protected)/(tabs)/reports.tsx
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Platform,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ReportsScreen() {
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
    };

    const scrollContentStyle: ViewStyle = {
        padding: 16,
        paddingTop: Platform.select({ ios: 0, android: 16 }),
    };

    const headerStyle: ViewStyle = {
        marginBottom: 24,
    };

    const titleStyle: TextStyle = {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 4,
    };

    const subtitleStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
    };

    const cardStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const cardHeaderStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    };

    const cardIconStyle: ViewStyle = {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    };

    const cardTitleStyle: TextStyle = {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    };

    const cardDescriptionStyle: TextStyle = {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
    };

    const buttonStyle: ViewStyle = {
        backgroundColor: colors.primary + '10',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    };

    const buttonTextStyle: TextStyle = {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    };

    const comingSoonStyle: ViewStyle = {
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        marginTop: 40,
    };

    const comingSoonTitleStyle: TextStyle = {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    };

    const comingSoonTextStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    };

    const reportCards = [
        {
            icon: 'bar-chart',
            title: 'Safety Analytics',
            description: 'Comprehensive analysis of safety trends and patterns across all inspections.',
            action: 'Generate Report',
        },
        {
            icon: 'document-text',
            title: 'Monthly Summary',
            description: 'Monthly breakdown of safety metrics, hazards identified, and improvements.',
            action: 'View Summary',
        },
        {
            icon: 'trending-up',
            title: 'Trend Analysis',
            description: 'Track safety improvements and identify recurring issues over time.',
            action: 'View Trends',
        },
        {
            icon: 'shield-checkmark',
            title: 'Compliance Report',
            description: 'Detailed compliance status against industry safety standards.',
            action: 'Check Compliance',
        },
        {
            icon: 'people',
            title: 'Team Performance',
            description: 'Performance metrics and safety awareness across team members.',
            action: 'View Performance',
        },
        {
            icon: 'download',
            title: 'Export Data',
            description: 'Download your inspection data in various formats (PDF, Excel, CSV).',
            action: 'Export Data',
        },
    ];

    return (
        <View style={containerStyle}>
            <ScrollView
                contentContainerStyle={scrollContentStyle}
                showsVerticalScrollIndicator={false}
            >
                <View style={headerStyle}>
                    <Text style={titleStyle}>Reports</Text>
                    <Text style={subtitleStyle}>
                        Generate insights from your safety data
                    </Text>
                </View>

                {reportCards.map((card, index) => (
                    <View key={index} style={cardStyle}>
                        <View style={cardHeaderStyle}>
                            <View style={cardIconStyle}>
                                <Ionicons
                                    name={card.icon as any}
                                    size={20}
                                    color={colors.primary}
                                />
                            </View>
                            <Text style={cardTitleStyle}>{card.title}</Text>
                        </View>
                        <Text style={cardDescriptionStyle}>
                            {card.description}
                        </Text>
                        <TouchableOpacity style={buttonStyle}>
                            <Text style={buttonTextStyle}>{card.action}</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <View style={comingSoonStyle}>
                    <Ionicons name="construct" size={48} color={colors.textTertiary} />
                    <Text style={comingSoonTitleStyle}>Coming Soon</Text>
                    <Text style={comingSoonTextStyle}>
                        Advanced reporting features are currently in development.
                        Stay tuned for powerful analytics and insights!
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}