// src/components/InspectionCard.tsx
import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ViewStyle,
    TextStyle,
    ImageStyle,
} from 'react-native';
import { useTheme, spacing, borderRadius, typography, shadows } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SafetyGrade, ProcessingStatus } from '@/types';

interface InspectionCardProps {
    id: string;
    imageUrl: string;
    createdAt: string;
    hazardCount: number | null;
    riskScore: number | null;
    safetyGrade: SafetyGrade | null;
    processingStatus: ProcessingStatus;
    onPress: () => void;
    variant?: 'default' | 'compact' | 'detailed';
}

export default function InspectionCard({
                                           id,
                                           imageUrl,
                                           createdAt,
                                           hazardCount,
                                           riskScore,
                                           safetyGrade,
                                           processingStatus,
                                           onPress,
                                           variant = 'default',
                                       }: InspectionCardProps) {
    const { colors } = useTheme();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getGradeColor = (grade: SafetyGrade | null) => {
        if (!grade) return colors.textTertiary;
        const gradeColors = {
            A: colors.success,
            B: '#3b82f6',
            C: colors.warning,
            D: '#f97316',
            F: colors.error,
        };
        return gradeColors[grade];
    };

    const getStatusInfo = (status: ProcessingStatus) => {
        const statusMap = {
            completed: {
                icon: 'checkmark-circle' as const,
                color: colors.success,
                bgColor: colors.successBackground,
                text: 'Complete',
            },
            processing: {
                icon: 'sync' as const,
                color: colors.warning,
                bgColor: colors.warningBackground,
                text: 'Processing',
            },
            pending: {
                icon: 'hourglass' as const,
                color: colors.textTertiary,
                bgColor: colors.backgroundTertiary,
                text: 'Pending',
            },
            failed: {
                icon: 'alert-circle' as const,
                color: colors.error,
                bgColor: colors.errorBackground,
                text: 'Failed',
            },
        };
        return statusMap[status];
    };

    const getRiskScoreColor = (score: number | null) => {
        if (!score) return colors.textTertiary;
        if (score >= 80) return colors.error;
        if (score >= 60) return '#ea580c';
        if (score >= 40) return colors.warning;
        return colors.success;
    };

    const statusInfo = getStatusInfo(processingStatus);

    // Base styles
    const cardStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        overflow: 'hidden',
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const imageStyle: ImageStyle = {
        width: '100%',
        height: variant === 'compact' ? 120 : 160,
        backgroundColor: colors.backgroundTertiary,
    };

    const contentStyle: ViewStyle = {
        padding: spacing.md,
    };

    const headerStyle: ViewStyle = {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    };

    const titleStyle: TextStyle = {
        fontSize: typography.lg.fontSize,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        marginRight: spacing.sm,
    };

    const dateStyle: TextStyle = {
        fontSize: typography.sm.fontSize,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    };

    const statusBadgeStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        backgroundColor: statusInfo.bgColor,
        gap: spacing.xs,
    };

    const statusTextStyle: TextStyle = {
        fontSize: typography.sm.fontSize,
        fontWeight: '600',
        color: statusInfo.color,
    };

    const renderCompactVariant = () => (
        <TouchableOpacity style={[cardStyle, { flexDirection: 'row' }]} onPress={onPress}>
            <Image source={{ uri: imageUrl }} style={[imageStyle, { width: 120, height: 80 }]} resizeMode="cover" />
            <View style={[contentStyle, { flex: 1, padding: spacing.sm }]}>
                <Text style={[titleStyle, { fontSize: typography.base.fontSize }]} numberOfLines={1}>
                    Inspection #{id.slice(-6)}
                </Text>
                <Text style={[dateStyle, { fontSize: typography.xs.fontSize, marginBottom: spacing.xs }]}>
                    {formatDate(createdAt)}
                </Text>
                <View style={[statusBadgeStyle, { alignSelf: 'flex-start' }]}>
                    <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                    <Text style={[statusTextStyle, { fontSize: typography.xs.fontSize }]}>
                        {statusInfo.text}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderDetailedVariant = () => (
        <TouchableOpacity style={cardStyle} onPress={onPress}>
            <Image source={{ uri: imageUrl }} style={imageStyle} resizeMode="cover" />
            <View style={contentStyle}>
                <View style={headerStyle}>
                    <View style={{ flex: 1 }}>
                        <Text style={titleStyle}>
                            Inspection #{id.slice(-8)}
                        </Text>
                        <Text style={dateStyle}>
                            {formatDate(createdAt)}
                        </Text>
                    </View>
                    <View style={statusBadgeStyle}>
                        <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                        <Text style={statusTextStyle}>{statusInfo.text}</Text>
                    </View>
                </View>

                {/* Metrics Grid */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: colors.borderLight,
                }}>
                    <MetricItem
                        icon="speedometer"
                        label="Risk Score"
                        value={riskScore?.toString() ?? '-'}
                        color={getRiskScoreColor(riskScore)}
                    />
                    <MetricItem
                        icon="warning"
                        label="Hazards"
                        value={hazardCount?.toString() ?? '-'}
                        color={hazardCount ? colors.warning : colors.textTertiary}
                    />
                    <MetricItem
                        icon="shield-checkmark"
                        label="Grade"
                        value={safetyGrade ?? '-'}
                        color={getGradeColor(safetyGrade)}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderDefaultVariant = () => (
        <TouchableOpacity style={cardStyle} onPress={onPress}>
            <Image source={{ uri: imageUrl }} style={imageStyle} resizeMode="cover" />
            <View style={contentStyle}>
                <View style={headerStyle}>
                    <Text style={titleStyle}>
                        Inspection #{id.slice(-8)}
                    </Text>
                    <View style={statusBadgeStyle}>
                        <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
                        <Text style={statusTextStyle}>{statusInfo.text}</Text>
                    </View>
                </View>

                <Text style={dateStyle}>
                    {formatDate(createdAt)}
                </Text>

                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    paddingTop: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: colors.borderLight,
                }}>
                    <StatItem
                        label="Risk"
                        value={riskScore?.toString() ?? '-'}
                        color={getRiskScoreColor(riskScore)}
                    />
                    <StatItem
                        label="Hazards"
                        value={hazardCount?.toString() ?? '-'}
                        color={hazardCount ? colors.warning : colors.textTertiary}
                    />
                    <StatItem
                        label="Grade"
                        value={safetyGrade ?? '-'}
                        color={getGradeColor(safetyGrade)}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );

    switch (variant) {
        case 'compact':
            return renderCompactVariant();
        case 'detailed':
            return renderDetailedVariant();
        default:
            return renderDefaultVariant();
    }
}

// Helper components
interface StatItemProps {
    label: string;
    value: string;
    color: string;
}

function StatItem({ label, value, color }: StatItemProps) {
    const { colors } = useTheme();

    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{
                fontSize: typography.lg.fontSize,
                fontWeight: '700',
                color: color,
                marginBottom: 2,
            }}>
                {value}
            </Text>
            <Text style={{
                fontSize: typography.xs.fontSize,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
            }}>
                {label}
            </Text>
        </View>
    );
}

interface MetricItemProps {
    icon: string;
    label: string;
    value: string;
    color: string;
}

function MetricItem({ icon, label, value, color }: MetricItemProps) {
    const { colors } = useTheme();

    return (
        <View style={{ alignItems: 'center', flex: 1 }}>
            <Ionicons name={icon as any} size={20} color={color} />
            <Text style={{
                fontSize: typography.base.fontSize,
                fontWeight: '600',
                color: color,
                marginTop: spacing.xs,
                marginBottom: 2,
            }}>
                {value}
            </Text>
            <Text style={{
                fontSize: typography.xs.fontSize,
                color: colors.textSecondary,
                textAlign: 'center',
            }}>
                {label}
            </Text>
        </View>
    );
}