// src/app/(protected)/(tabs)/inspections.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    RefreshControl,
    Platform,
    ViewStyle,
    TextStyle,
    ListRenderItem,
    TouchableOpacity,
} from 'react-native';
import { useSession } from '@clerk/clerk-expo';
import { useTheme, spacing, typography, borderRadius } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Inspection, ListResponse } from '@/types';
import InspectionCard from '@/components/InspectionCard';
import LoadingScreen from '@/components/LoadingScreen';

const DEFAULT_BASE = "https://hseappapi.vercel.app";
const PAGE_SIZE = 20;

type FilterType = 'all' | 'completed' | 'processing' | 'pending' | 'failed';
type SortType = 'newest' | 'oldest' | 'risk-high' | 'risk-low';

interface FilterOption {
    key: FilterType;
    label: string;
    icon: string;
    count?: number;
}

interface SortOption {
    key: SortType;
    label: string;
    icon: string;
}

export default function InspectionsScreen() {
    const { colors } = useTheme();
    const { session } = useSession();
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [sort, setSort] = useState<SortType>('newest');

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

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchInspections(true);
    }, [fetchInspections]);

    // Filter and sort inspections
    const processedInspections = useMemo(() => {
        let filtered = inspections;

        // Apply filter
        if (filter !== 'all') {
            filtered = inspections.filter(inspection => inspection.processingStatus === filter);
        }

        // Apply sort
        const sorted = [...filtered].sort((a, b) => {
            switch (sort) {
                case 'newest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'oldest':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'risk-high':
                    return (b.riskScore || 0) - (a.riskScore || 0);
                case 'risk-low':
                    return (a.riskScore || 0) - (b.riskScore || 0);
                default:
                    return 0;
            }
        });

        return sorted;
    }, [inspections, filter, sort]);

    // Calculate filter counts
    const filterCounts = useMemo(() => {
        const counts = inspections.reduce((acc, inspection) => {
            acc[inspection.processingStatus] = (acc[inspection.processingStatus] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            all: inspections.length,
            ...counts,
        };
    }, [inspections]);

    const filterOptions: FilterOption[] = [
        { key: 'all', label: 'All', icon: 'apps', count: filterCounts.all },
        { key: 'completed', label: 'Complete', icon: 'checkmark-circle', count: filterCounts.completed },
        { key: 'processing', label: 'Processing', icon: 'sync', count: filterCounts.processing },
        { key: 'pending', label: 'Pending', icon: 'hourglass', count: filterCounts.pending },
        { key: 'failed', label: 'Failed', icon: 'alert-circle', count: filterCounts.failed },
    ];

    const sortOptions: SortOption[] = [
        { key: 'newest', label: 'Newest First', icon: 'time' },
        { key: 'oldest', label: 'Oldest First', icon: 'time-outline' },
        { key: 'risk-high', label: 'High Risk First', icon: 'trending-up' },
        { key: 'risk-low', label: 'Low Risk First', icon: 'trending-down' },
    ];

    const renderInspectionItem: ListRenderItem<Inspection> = ({ item, index }) => (
        <InspectionCard
            key={item.id}
            id={item.id}
            imageUrl={item.imageUrl}
            createdAt={item.createdAt}
            hazardCount={item.hazardCount}
            riskScore={item.riskScore}
            safetyGrade={item.safetyGrade}
            processingStatus={item.processingStatus}
            onPress={() => router.push(`/inspection/${item.id}`)}
            variant={index === 0 ? 'detailed' : 'default'}
        />
    );

    const renderEmptyState = () => (
        <View style={emptyStateStyle}>
            <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
            <Text style={emptyTitleStyle}>
                {filter === 'all' ? 'No Inspections Yet' : `No ${filter} inspections`}
            </Text>
            <Text style={emptySubtitleStyle}>
                {filter === 'all'
                    ? 'Start by taking a photo and running your first safety analysis.'
                    : `Try changing the filter to see more inspections.`}
            </Text>
        </View>
    );

    const renderHeader = () => (
        <View style={headerStyle}>
            <View style={titleSectionStyle}>
                <Text style={titleStyle}>Inspections</Text>
                <Text style={subtitleStyle}>
                    {processedInspections.length} {processedInspections.length === 1 ? 'inspection' : 'inspections'}
                    {filter !== 'all' && ` • ${filter}`}
                </Text>
            </View>

            {/* Filter Pills */}
            <FlatList
                data={filterOptions}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={filterScrollStyle}
                renderItem={({ item }) => (
                    <FilterPill
                        option={item}
                        isSelected={filter === item.key}
                        onPress={() => setFilter(item.key)}
                    />
                )}
                style={filterContainerStyle}
            />
        </View>
    );

    // Styles
    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
    };

    const headerStyle: ViewStyle = {
        paddingHorizontal: spacing.md,
        paddingTop: Platform.select({ ios: 0, android: spacing.md }),
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
    };

    const titleSectionStyle: ViewStyle = {
        marginBottom: spacing.md,
    };

    const titleStyle: TextStyle = {
        fontSize: typography['3xl'].fontSize,
        fontWeight: '800',
        color: colors.text,
        marginBottom: spacing.xs,
    };

    const subtitleStyle: TextStyle = {
        fontSize: typography.base.fontSize,
        color: colors.textSecondary,
    };

    const filterContainerStyle: ViewStyle = {
        marginVertical: spacing.sm,
    };

    const filterScrollStyle: ViewStyle = {
        paddingRight: spacing.md,
        gap: spacing.sm,
    };

    const emptyStateStyle: ViewStyle = {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxxl,
    };

    const emptyTitleStyle: TextStyle = {
        fontSize: typography.xl.fontSize,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    };

    const emptySubtitleStyle: TextStyle = {
        fontSize: typography.base.fontSize,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: typography.base.lineHeight * 1.5,
    };

    if (loading) {
        return (
            <LoadingScreen
                message="Loading Inspections"
                submessage="Fetching your safety analysis history..."
            />
        );
    }

    if (error) {
        return (
            <View style={[containerStyle, emptyStateStyle]}>
                <Ionicons name="alert-circle" size={64} color={colors.error} />
                <Text style={[emptyTitleStyle, { color: colors.error }]}>Failed to Load</Text>
                <Text style={emptySubtitleStyle}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            <FlatList
                data={processedInspections}
                keyExtractor={(item) => item.id}
                renderItem={renderInspectionItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={{
                    paddingHorizontal: spacing.md,
                    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Account for tab bar
                    flexGrow: processedInspections.length === 0 ? 1 : 0,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
            />
        </View>
    );
}

// Helper component
interface FilterPillProps {
    option: FilterOption;
    isSelected: boolean;
    onPress: () => void;
}

function FilterPill({ option, isSelected, onPress }: FilterPillProps) {
    const { colors } = useTheme();

    const pillStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: isSelected ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: isSelected ? colors.primary : colors.border,
        gap: spacing.xs,
    };

    const textStyle: TextStyle = {
        fontSize: typography.sm.fontSize,
        fontWeight: '600',
        color: isSelected ? colors.textOnPrimary : colors.text,
    };

    const countStyle: TextStyle = {
        fontSize: typography.xs.fontSize,
        fontWeight: '700',
        color: isSelected ? colors.textOnPrimary : colors.textSecondary,
    };

    return (
        <TouchableOpacity style={pillStyle} onPress={onPress}>
            <Ionicons
                name={option.icon as any}
                size={16}
                color={isSelected ? colors.textOnPrimary : colors.textSecondary}
            />
            <Text style={textStyle}>{option.label}</Text>
            {option.count !== undefined && option.count > 0 && (
                <Text style={countStyle}>({option.count})</Text>
            )}
        </TouchableOpacity>
    );
}