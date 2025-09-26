// src/app/(protected)/(tabs)/inspections.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    RefreshControl,
    ActivityIndicator,
    Platform,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useSession } from '@clerk/clerk-expo';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

type SafetyGrade = "A" | "B" | "C" | "D" | "F";

interface Inspection {
    id: string;
    createdAt: string;
    imageUrl: string;
    hazardCount: number | null;
    riskScore: number | null;
    safetyGrade: SafetyGrade | null;
    processingStatus: string;
}

interface ListResponse {
    ok: boolean;
    inspections: Inspection[];
    page: number;
    pageSize: number;
    totalCount: number;
}

const DEFAULT_BASE = "https://hseappapi.vercel.app";
const PAGE_SIZE = 20;

export default function InspectionsScreen() {
    const { colors } = useTheme();
    const { session } = useSession();
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buildAuthHeaders = useCallback(async () => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (session) {
            try {
                const token = await session.getToken();
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                }
            } catch (error) {
                console.error("Error getting token:", error);
            }
        }

        return headers;
    }, [session]);

    const fetchInspections = useCallback(async (isRefresh = false) => {
        if (!session) return;

        try {
            if (!isRefresh) setLoading(true);
            setError(null);

            const headers = await buildAuthHeaders();
            const response = await fetch(
                `${DEFAULT_BASE}/api/inspections/list?page=1&pageSize=${PAGE_SIZE}`,
                { headers }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch inspections: ${response.status}`);
            }

            const data: ListResponse = await response.json();
            if (data.ok) {
                setInspections(data.inspections);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load inspections');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [session, buildAuthHeaders]);

    useEffect(() => {
        fetchInspections();
    }, [fetchInspections]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchInspections(true);
    };

    const getGradeColor = (grade: SafetyGrade | null) => {
        if (!grade) return colors.textTertiary;
        const gradeColors = {
            A: colors.success,
            B: "#3b82f6",
            C: colors.warning,
            D: "#f97316",
            F: colors.error,
        };
        return gradeColors[grade];
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return colors.success;
            case 'processing': return colors.warning;
            case 'failed': return colors.error;
            default: return colors.textTertiary;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderInspectionItem = ({ item }: { item: Inspection }) => {
        const itemStyle: ViewStyle = {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: colors.border,
        };

        const headerStyle: ViewStyle = {
            flexDirection: 'row',
            marginBottom: 12,
        };

        const imageStyle: ViewStyle = {
            width: 60,
            height: 60,
            borderRadius: 8,
            backgroundColor: colors.backgroundTertiary,
            marginRight: 12,
        };

        const contentStyle: ViewStyle = {
            flex: 1,
        };

        const titleStyle: TextStyle = {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 4,
        };

        const dateStyle: TextStyle = {
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 8,
        };

        const statsStyle: ViewStyle = {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
        };

        const statStyle: ViewStyle = {
            alignItems: 'center',
        };

        const statValueStyle: TextStyle = {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
        };

        const statLabelStyle: TextStyle = {
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 2,
        };

        const statusBadgeStyle: ViewStyle = {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            backgroundColor: getStatusColor(item.processingStatus) + '15',
        };

        const statusTextStyle: TextStyle = {
            fontSize: 11,
            fontWeight: '600',
            color: getStatusColor(item.processingStatus),
            textTransform: 'capitalize',
        };

        return (
            <View style={itemStyle}>
                <View style={headerStyle}>
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={imageStyle}
                        resizeMode="cover"
                    />
                    <View style={contentStyle}>
                        <Text style={titleStyle}>
                            Inspection #{item.id.slice(-8)}
                        </Text>
                        <Text style={dateStyle}>
                            {formatDate(item.createdAt)}
                        </Text>
                        <View style={statusBadgeStyle}>
                            <Text style={statusTextStyle}>{item.processingStatus}</Text>
                        </View>
                    </View>
                </View>

                <View style={statsStyle}>
                    <View style={statStyle}>
                        <Text style={[statValueStyle, { color: item.riskScore ? colors.error : colors.textTertiary }]}>
                            {item.riskScore ?? '-'}
                        </Text>
                        <Text style={statLabelStyle}>Risk Score</Text>
                    </View>
                    <View style={statStyle}>
                        <Text style={[statValueStyle, { color: item.hazardCount ? colors.warning : colors.textTertiary }]}>
                            {item.hazardCount ?? '-'}
                        </Text>
                        <Text style={statLabelStyle}>Hazards</Text>
                    </View>
                    <View style={statStyle}>
                        <Text style={[statValueStyle, { color: getGradeColor(item.safetyGrade) }]}>
                            {item.safetyGrade ?? '-'}
                        </Text>
                        <Text style={statLabelStyle}>Grade</Text>
                    </View>
                </View>
            </View>
        );
    };

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
    };

    const listContentStyle: ViewStyle = {
        padding: 16,
        paddingTop: Platform.select({ ios: 0, android: 16 }),
    };

    const emptyStateStyle: ViewStyle = {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        minHeight: 400,
    };

    const emptyTitleStyle: TextStyle = {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    };

    const emptySubtitleStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    };

    const errorStateStyle: ViewStyle = {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    };

    const errorTitleStyle: TextStyle = {
        fontSize: 18,
        fontWeight: '600',
        color: colors.error,
        marginTop: 16,
        marginBottom: 8,
    };

    const errorTextStyle: TextStyle = {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    };

    if (loading) {
        return (
            <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
                    Loading inspections...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[containerStyle, errorStateStyle]}>
                <Ionicons name="alert-circle" size={64} color={colors.error} />
                <Text style={errorTitleStyle}>Failed to Load</Text>
                <Text style={errorTextStyle}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            <FlatList
                data={inspections}
                keyExtractor={(item) => item.id}
                renderItem={renderInspectionItem}
                contentContainerStyle={listContentStyle}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={emptyStateStyle}>
                        <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
                        <Text style={emptyTitleStyle}>No Inspections Yet</Text>
                        <Text style={emptySubtitleStyle}>
                            Start by taking a photo and running your first safety analysis.
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}