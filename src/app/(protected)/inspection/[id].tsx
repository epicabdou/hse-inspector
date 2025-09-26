// src/app/(protected)/inspection/[id].tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Share,
    Animated,
    Dimensions,
    Modal,
    TouchableWithoutFeedback,
    RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSession } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';

// Constants
const { width: screenWidth } = Dimensions.get('window');
const DEFAULT_BASE = "https://hseappapi.vercel.app";

// Types
type HazardCategory = "PPE" | "Fall" | "Fire" | "Electrical" | "Chemical" | "Machinery" | "Environmental" | "Other";
type Severity = "Critical" | "High" | "Medium" | "Low";
type SafetyGrade = "A" | "B" | "C" | "D" | "F";
type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

interface Hazard {
    id: string;
    description: string;
    location: string;
    category: HazardCategory;
    severity: Severity;
    immediateSolutions: string[];
    longTermSolutions: string[];
    estimatedCost?: string;
    timeToImplement?: string;
    priority: number;
}

interface Overall {
    riskScore: number;
    safetyGrade: SafetyGrade;
    topPriorities: string[];
    complianceStandards?: string[];
}

interface AnalysisResult {
    hazards: Hazard[];
    overallAssessment: Overall;
    metadata: { analysisTime: number; tokensUsed: number; confidence: number };
}

interface Inspection {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    imageUrl: string;
    originalImageUrl?: string;
    hazardCount: number | null;
    riskScore: number | null;
    safetyGrade: SafetyGrade | null;
    analysisResults: AnalysisResult | null;
    processingStatus: ProcessingStatus;
}

interface InspectionResponse {
    ok: boolean;
    inspection: Inspection;
}

interface UsageLogData {
    id: string;
    endpoint: string;
    tokensUsed: number | null;
    apiCost: string | null;
    responseTime: number | null;
    success: boolean;
    createdAt: string;
}

// Custom hooks
const useAuthHeaders = () => {
    const { session } = useSession();

    const getAuthToken = useCallback(async (): Promise<string | null> => {
        if (!session) {
            console.warn("No active Clerk session found.");
            return null;
        }

        try {
            const token = await session.getToken();
            return token;
        } catch (error) {
            console.error("Error getting Clerk token:", error);
            return null;
        }
    }, [session]);

    const buildAuthHeaders = useCallback(async () => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        const token = await getAuthToken();
        if (!token) {
            throw new Error("Authentication required. Please ensure you're logged in.");
        }

        headers["Authorization"] = `Bearer ${token}`;
        return headers;
    }, [getAuthToken]);

    return { buildAuthHeaders };
};

const useInspectionData = (id: string | undefined) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inspectionData, setInspectionData] = useState<InspectionResponse | null>(null);
    const [usageLogData, setUsageLogData] = useState<UsageLogData | null>(null);
    const [loadingUsageData, setLoadingUsageData] = useState(false);

    const { session } = useSession();
    const { buildAuthHeaders } = useAuthHeaders();

    const fetchUsageLogs = useCallback(async (inspectionDate: string) => {
        if (!session) return;

        try {
            setLoadingUsageData(true);
            const headers = await buildAuthHeaders();

            const inspectionTime = new Date(inspectionDate);
            const before = new Date(inspectionTime.getTime() + 5 * 60000).toISOString();
            const after = new Date(inspectionTime.getTime() - 5 * 60000).toISOString();

            const response = await fetch(
                `${DEFAULT_BASE}/api/inspections/usage-logs/list?endpoint=/api/inspections/analyze&after=${after}&before=${before}&pageSize=1`,
                { headers }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.ok && data.usageLogs?.length > 0) {
                    setUsageLogData(data.usageLogs[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch usage logs:', error);
        } finally {
            setLoadingUsageData(false);
        }
    }, [session, buildAuthHeaders]);

    const fetchInspection = useCallback(async (isRefresh = false) => {
        if (!id) {
            setError("No inspection ID provided");
            setLoading(false);
            return;
        }

        if (!session) {
            setError("Authentication required");
            setLoading(false);
            return;
        }

        try {
            if (!isRefresh) setLoading(true);
            setError(null);

            const headers = await buildAuthHeaders();
            const response = await fetch(
                `${DEFAULT_BASE}/api/inspections/${id}`,
                { headers }
            );

            if (!response.ok) {
                const text = await response.text();
                if (response.status === 401) {
                    throw new Error("Authentication failed. Please sign in again.");
                }
                if (response.status === 404) {
                    throw new Error("Inspection not found.");
                }
                throw new Error(`Failed to load inspection (${response.status}): ${text}`);
            }

            const json: InspectionResponse = await response.json();
            if (!json.ok) {
                throw new Error("Invalid response format");
            }

            setInspectionData(json);
        } catch (e: any) {
            setError(e?.message || "Failed to load inspection");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, session, buildAuthHeaders]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchInspection(true);
    }, [fetchInspection]);

    useEffect(() => {
        fetchInspection();
    }, [fetchInspection]);

    useEffect(() => {
        if (inspectionData?.inspection?.createdAt) {
            fetchUsageLogs(inspectionData.inspection.createdAt);
        }
    }, [inspectionData?.inspection?.createdAt, fetchUsageLogs]);

    return {
        loading,
        refreshing,
        error,
        inspectionData,
        usageLogData,
        loadingUsageData,
        handleRefresh,
        fetchInspection
    };
};

// Utility functions
const formatCurrency = (cost: string | null): string => {
    if (!cost) return 'N/A';
    const num = parseFloat(cost);
    return `${num.toFixed(4)}`;
};

const formatTime = (ms: number | null): string => {
    if (!ms) return 'N/A';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
};

const getRiskScoreColor = (score: number): string => {
    if (score >= 80) return "#dc2626";
    if (score >= 60) return "#ea580c";
    if (score >= 40) return "#ca8a04";
    return "#16a34a";
};

const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
        PPE: "🦺",
        Fall: "⚠️",
        Fire: "🔥",
        Electrical: "⚡",
        Chemical: "🧪",
        Machinery: "⚙️",
        Environmental: "🌍",
        Other: "📋",
    };
    return icons[category] || "📋";
};

const getTokenUsageColor = (tokens: number): string => {
    if (tokens > 8000) return "#ef4444";
    if (tokens > 5000) return "#f59e0b";
    return "#10b981";
};

const getTokenUsageMessage = (tokens: number): string => {
    if (tokens > 8000) return "High token usage - complex image analysis";
    if (tokens > 5000) return "Moderate token usage - detailed analysis";
    return "Efficient token usage - optimized processing";
};

const getSeverityColors = () => ({
    Critical: "#991b1b",
    High: "#dc2626",
    Medium: "#f59e0b",
    Low: "#16a34a",
});

const getGradeColors = () => ({
    A: "#10b981",
    B: "#3b82f6",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
});

// Components
const LoadingCard: React.FC = () => (
    <View style={styles.centerContainer}>
        <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingTitle}>Loading Inspection</Text>
            <Text style={styles.loadingSubtitle}>Fetching analysis details...</Text>
        </View>
    </View>
);

const ErrorCard: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
    <View style={styles.centerContainer}>
        <View style={styles.errorCard}>
            <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={48} color="#ef4444" />
            </View>
            <Text style={styles.errorTitle}>Unable to Load</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <View style={styles.errorActions}>
                <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#4f46e5" />
                    <Text style={styles.secondaryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

const NoDataCard: React.FC = () => (
    <View style={styles.centerContainer}>
        <View style={styles.noDataCard}>
            <Ionicons name="document-outline" size={64} color="#9ca3af" />
            <Text style={styles.noDataTitle}>No Data Available</Text>
            <Text style={styles.noDataSubtitle}>This inspection could not be found</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    </View>
);

const InspectionHeader: React.FC<{
    inspection: Inspection;
    onShare: () => void;
}> = ({ inspection, onShare }) => (
    <View style={styles.header}>
        <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
        >
            <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Inspection Report</Text>
            <Text style={styles.headerDate}>
                {new Date(inspection.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </Text>
        </View>

        <TouchableOpacity
            onPress={onShare}
            style={styles.headerButton}
        >
            <Ionicons name="share-outline" size={24} color="#111827" />
        </TouchableOpacity>
    </View>
);

const ProcessingStatusCard: React.FC<{
    status: ProcessingStatus;
    onRefresh: () => void;
}> = ({ status, onRefresh }) => {
    const getStatusInfo = useCallback((status: ProcessingStatus) => {
        const statusMap = {
            completed: {
                icon: "checkmark-circle" as const,
                color: "#10b981",
                bgColor: "#f0fdf4",
                text: "Analysis Complete",
                subtitle: "Safety assessment ready"
            },
            processing: {
                icon: "sync" as const,
                color: "#f59e0b",
                bgColor: "#fef3c7",
                text: "Processing...",
                subtitle: "AI analyzing image"
            },
            pending: {
                icon: "hourglass" as const,
                color: "#6b7280",
                bgColor: "#f9fafb",
                text: "Pending Analysis",
                subtitle: "Waiting in queue"
            },
            failed: {
                icon: "alert-circle" as const,
                color: "#ef4444",
                bgColor: "#fef2f2",
                text: "Analysis Failed",
                subtitle: "Unable to process"
            }
        };
        return statusMap[status];
    }, []);

    const statusInfo = getStatusInfo(status);

    return (
        <View style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}>
            <View style={styles.statusContent}>
                <View style={[styles.statusIconContainer, { backgroundColor: `${statusInfo.color}15` }]}>
                    <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
                </View>
                <View style={styles.statusTextContent}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.text}
                    </Text>
                    <Text style={styles.statusSubtext}>{statusInfo.subtitle}</Text>
                </View>
                {status === "processing" && (
                    <TouchableOpacity onPress={onRefresh} style={styles.statusRefreshButton}>
                        <Ionicons name="refresh" size={20} color={statusInfo.color} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    scrollContent: {
        paddingTop: Platform.select({ ios: 60, android: 40, default: 40 }),
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        paddingHorizontal: 20,
    },

    // Loading Card
    loadingCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 40,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginTop: 16,
        marginBottom: 4,
    },
    loadingSubtitle: {
        fontSize: 14,
        color: "#6b7280",
    },

    // Error Card
    errorCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
        maxWidth: 340,
    },
    errorIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#fef2f2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 15,
        color: "#6b7280",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
    },
    errorActions: {
        gap: 12,
        width: "100%",
    },

    // No Data Card
    noDataCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 40,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    noDataTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginTop: 16,
        marginBottom: 4,
    },
    noDataSubtitle: {
        fontSize: 14,
        color: "#6b7280",
        marginBottom: 24,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#f3f4f6",
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
        marginHorizontal: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
    },
    headerDate: {
        fontSize: 14,
        color: "#6b7280",
        marginTop: 2,
    },

    // Status Card
    statusCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    statusContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    statusTextContent: {
        flex: 1,
    },
    statusText: {
        fontSize: 16,
        fontWeight: "700",
    },
    statusSubtext: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 2,
    },
    statusRefreshButton: {
        padding: 8,
    },

    // Image Card
    imageCard: {
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#fff",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    inspectionImage: {
        width: "100%",
        height: 260,
        backgroundColor: "#f3f4f6",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    imageOverlayContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    imageOverlayText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },

    // Assessment Card
    assessmentCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    assessmentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    assessmentTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },
    assessmentSubtitle: {
        fontSize: 14,
        color: "#6b7280",
        marginTop: 2,
    },

    // Grade Badge
    gradeBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gradeBadgeText: {
        fontSize: 28,
        fontWeight: "800",
        color: "#fff",
    },

    // Metrics Grid
    metricsGrid: {
        flexDirection: "row",
        gap: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    metricContent: {
        alignItems: "center",
        marginTop: 8,
    },
    metricValue: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 4,
    },
    metricSuffix: {
        fontSize: 14,
        fontWeight: "400",
    },
    metricLabel: {
        fontSize: 11,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    // Priorities
    prioritiesSection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
    },
    prioritiesTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 12,
    },
    priorityItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
    },
    priorityNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#4f46e5",
        justifyContent: "center",
        alignItems: "center",
    },
    priorityNumberText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    priorityText: {
        flex: 1,
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
    },

    // Compliance
    complianceSection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#f3f4f6",
    },
    complianceTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 12,
    },
    complianceList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    compliancePill: {
        backgroundColor: "#f0fdf4",
        borderColor: "#10b981",
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    complianceText: {
        color: "#059669",
        fontSize: 13,
        fontWeight: "600",
    },

    // Hazards Container
    hazardsContainer: {
        marginBottom: 16,
    },
    hazardsTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 16,
    },

    // Category Section
    categorySection: {
        marginBottom: 20,
    },
    categoryHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },
    categoryBadge: {
        backgroundColor: "#f3f4f6",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    categoryCount: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6b7280",
    },

    // Hazard Card
    hazardCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    hazardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    hazardTitleSection: {
        flex: 1,
        marginRight: 12,
    },
    hazardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 6,
    },
    hazardLocationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    hazardLocation: {
        fontSize: 13,
        color: "#6b7280",
    },
    severityBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
        alignSelf: "flex-start",
    },
    severityText: {
        fontSize: 13,
        fontWeight: "700",
    },

    // Hazard Metrics
    hazardMetrics: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    hazardMetric: {
        flex: 1,
    },
    hazardMetricLabel: {
        fontSize: 11,
        color: "#6b7280",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    hazardMetricValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },
    priorityBar: {
        height: 6,
        backgroundColor: "#e5e7eb",
        borderRadius: 3,
        marginVertical: 4,
        overflow: "hidden",
    },
    priorityFill: {
        height: "100%",
        borderRadius: 3,
    },

    // Solutions
    solutionsContainer: {
        gap: 16,
    },
    solutionSection: {
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    solutionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    solutionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },
    solutionItem: {
        flexDirection: "row",
        marginBottom: 8,
    },
    solutionBullet: {
        width: 20,
        marginTop: 2,
    },
    solutionBulletText: {
        fontSize: 14,
        color: "#6b7280",
    },
    solutionText: {
        flex: 1,
        fontSize: 14,
        color: "#4b5563",
        lineHeight: 20,
    },

    // Success Card
    successCard: {
        backgroundColor: "#f0fdf4",
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    successIcon: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#059669",
        marginBottom: 8,
    },
    successText: {
        fontSize: 15,
        color: "#047857",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 20,
    },
    successBadges: {
        flexDirection: "row",
        gap: 12,
    },
    successBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#10b981",
    },
    successBadgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#059669",
    },

    // Failed Card
    failedCard: {
        backgroundColor: "#fef2f2",
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    failedTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#991b1b",
        marginTop: 16,
        marginBottom: 8,
    },
    failedText: {
        fontSize: 15,
        color: "#7f1d1d",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
    },

    // Processing Card
    processingCard: {
        backgroundColor: "#fef3c7",
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#fde68a",
    },
    processingTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#78350f",
        marginTop: 16,
        marginBottom: 8,
    },
    processingText: {
        fontSize: 15,
        color: "#92400e",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
    },

    // Enhanced Metadata Card
    metadataCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    metadataHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    metadataTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },
    metadataGrid: {
        flexDirection: "row",
        gap: 24,
    },
    metadataItem: {
        flex: 1,
        alignItems: "center",
    },
    metadataLabel: {
        fontSize: 11,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 4,
        marginBottom: 2,
    },
    metadataValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },

    // Enhanced Metadata Details
    detailedMetadata: {
        marginTop: 12,
    },
    metadataDivider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginBottom: 16,
    },
    usageLoadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 8,
    },
    usageLoadingText: {
        fontSize: 14,
        color: "#6b7280",
    },
    usageTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 12,
    },
    usageGrid: {
        gap: 12,
        marginBottom: 16,
    },
    usageItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
    },
    usageLabel: {
        fontSize: 13,
        color: "#6b7280",
        flex: 1,
    },
    usageValue: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111827",
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    endpointText: {
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    tokenComparison: {
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    comparisonTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 8,
    },
    tokenBar: {
        marginBottom: 6,
    },
    tokenBarFill: {
        height: 6,
        backgroundColor: "#e5e7eb",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 4,
    },
    tokenBarProgress: {
        height: "100%",
        borderRadius: 3,
    },
    tokenBarText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#374151",
        textAlign: "center",
    },
    tokenBarSubtext: {
        fontSize: 10,
        color: "#6b7280",
        textAlign: "center",
    },
    noUsageData: {
        alignItems: "center",
        paddingVertical: 16,
        gap: 8,
    },
    noUsageText: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
    },

    // Buttons
    primaryButton: {
        flexDirection: "row",
        backgroundColor: "#4f46e5",
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    secondaryButton: {
        flexDirection: "row",
        backgroundColor: "#fff",
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 2,
        borderColor: "#e5e7eb",
        width: "100%",
    },
    secondaryButtonText: {
        color: "#4f46e5",
        fontSize: 16,
        fontWeight: "700",
    },
    refreshButton: {
        flexDirection: "row",
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        gap: 8,
        borderWidth: 2,
        borderColor: "#4f46e5",
    },
    refreshButtonText: {
        color: "#4f46e5",
        fontSize: 15,
        fontWeight: "600",
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalHeader: {
        position: "absolute",
        top: Platform.select({ ios: 60, android: 40, default: 40 }),
        right: 20,
        zIndex: 10,
    },
    modalCloseButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalImage: {
        width: screenWidth * 0.95,
        height: "80%",
    },
});;

const ImagePreviewCard: React.FC<{
    imageUrl: string;
    onPress: () => void;
}> = ({ imageUrl, onPress }) => (
    <TouchableOpacity
        style={styles.imageCard}
        onPress={onPress}
        activeOpacity={0.95}
    >
        <Image
            source={{ uri: imageUrl }}
            style={styles.inspectionImage}
            resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
            <View style={styles.imageOverlayContent}>
                <Ionicons name="expand" size={20} color="#fff" />
                <Text style={styles.imageOverlayText}>Tap to expand</Text>
            </View>
        </View>
    </TouchableOpacity>
);

const MetricCard: React.FC<{
    icon: string;
    label: string;
    value: string;
    suffix: string;
    color: string;
}> = ({ icon, label, value, suffix, color }) => (
    <View style={styles.metricCard}>
        <Ionicons name={icon as any} size={24} color={color} />
        <View style={styles.metricContent}>
            <Text style={[styles.metricValue, { color }]}>
                {value}<Text style={styles.metricSuffix}>{suffix}</Text>
            </Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    </View>
);

const GradeBadge: React.FC<{ grade: SafetyGrade }> = ({ grade }) => {
    const colors = getGradeColors();

    return (
        <View style={[styles.gradeBadge, { backgroundColor: colors[grade] }]}>
            <Text style={styles.gradeBadgeText}>{grade}</Text>
        </View>
    );
};

const HazardCard: React.FC<{ hazard: Hazard }> = ({ hazard }) => {
    const severityColors = getSeverityColors();

    return (
        <View style={styles.hazardCard}>
            <View style={styles.hazardHeader}>
                <View style={styles.hazardTitleSection}>
                    <Text style={styles.hazardTitle}>{hazard.description}</Text>
                    <View style={styles.hazardLocationRow}>
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text style={styles.hazardLocation}>{hazard.location}</Text>
                    </View>
                </View>
                <View style={[
                    styles.severityBadge,
                    { backgroundColor: `${severityColors[hazard.severity]}15` }
                ]}>
                    <Text style={[styles.severityText, { color: severityColors[hazard.severity] }]}>
                        {hazard.severity}
                    </Text>
                </View>
            </View>

            <View style={styles.hazardMetrics}>
                <View style={styles.hazardMetric}>
                    <Text style={styles.hazardMetricLabel}>Priority</Text>
                    <View style={styles.priorityBar}>
                        <Animated.View
                            style={[
                                styles.priorityFill,
                                {
                                    width: `${hazard.priority * 10}%`,
                                    backgroundColor: hazard.priority > 7 ? '#ef4444' :
                                        hazard.priority > 4 ? '#f59e0b' : '#10b981'
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.hazardMetricValue}>{hazard.priority}/10</Text>
                </View>

                {hazard.estimatedCost && (
                    <View style={styles.hazardMetric}>
                        <Text style={styles.hazardMetricLabel}>Cost</Text>
                        <Text style={styles.hazardMetricValue}>{hazard.estimatedCost}</Text>
                    </View>
                )}

                {hazard.timeToImplement && (
                    <View style={styles.hazardMetric}>
                        <Text style={styles.hazardMetricLabel}>Timeline</Text>
                        <Text style={styles.hazardMetricValue}>{hazard.timeToImplement}</Text>
                    </View>
                )}
            </View>

            <View style={styles.solutionsContainer}>
                <View style={styles.solutionSection}>
                    <View style={styles.solutionHeader}>
                        <Ionicons name="flash" size={16} color="#ef4444" />
                        <Text style={styles.solutionTitle}>Immediate Actions</Text>
                    </View>
                    {hazard.immediateSolutions.map((solution, index) => (
                        <View key={`immediate-${index}`} style={styles.solutionItem}>
                            <View style={styles.solutionBullet}>
                                <Text style={styles.solutionBulletText}>•</Text>
                            </View>
                            <Text style={styles.solutionText}>{solution}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.solutionSection}>
                    <View style={styles.solutionHeader}>
                        <Ionicons name="calendar" size={16} color="#4f46e5" />
                        <Text style={styles.solutionTitle}>Long-term Solutions</Text>
                    </View>
                    {hazard.longTermSolutions.map((solution, index) => (
                        <View key={`longterm-${index}`} style={styles.solutionItem}>
                            <View style={styles.solutionBullet}>
                                <Text style={styles.solutionBulletText}>•</Text>
                            </View>
                            <Text style={styles.solutionText}>{solution}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const AnalysisMetadata: React.FC<{
    analysis: AnalysisResult;
    usageLog: UsageLogData | null;
    loadingUsage: boolean;
}> = ({ analysis, usageLog, loadingUsage }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <View style={styles.metadataCard}>
            <TouchableOpacity
                style={styles.metadataHeader}
                onPress={() => setShowDetails(!showDetails)}
                activeOpacity={0.7}
            >
                <Text style={styles.metadataTitle}>
                    <Ionicons name="analytics" size={16} color="#6b7280" /> Analysis Details
                </Text>
                <Ionicons
                    name={showDetails ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6b7280"
                />
            </TouchableOpacity>

            <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                    <Ionicons name="time-outline" size={16} color="#9ca3af" />
                    <Text style={styles.metadataLabel}>Processing Time</Text>
                    <Text style={styles.metadataValue}>
                        {analysis.metadata.analysisTime}s
                    </Text>
                </View>
                <View style={styles.metadataItem}>
                    <Ionicons name="cube-outline" size={16} color="#9ca3af" />
                    <Text style={styles.metadataLabel}>Tokens Used</Text>
                    <Text style={styles.metadataValue}>
                        {analysis.metadata.tokensUsed.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.metadataItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#9ca3af" />
                    <Text style={styles.metadataLabel}>Confidence</Text>
                    <Text style={styles.metadataValue}>
                        {analysis.metadata.confidence}%
                    </Text>
                </View>
            </View>

            {showDetails && (
                <Animated.View style={styles.detailedMetadata}>
                    <View style={styles.metadataDivider} />

                    {loadingUsage ? (
                        <View style={styles.usageLoadingContainer}>
                            <ActivityIndicator size="small" color="#4f46e5" />
                            <Text style={styles.usageLoadingText}>Loading usage details...</Text>
                        </View>
                    ) : usageLog ? (
                        <>
                            <Text style={styles.usageTitle}>
                                <Ionicons name="server" size={14} color="#6b7280" /> Usage Metrics
                            </Text>
                            <View style={styles.usageGrid}>
                                <View style={styles.usageItem}>
                                    <Text style={styles.usageLabel}>API Response Time</Text>
                                    <Text style={styles.usageValue}>
                                        {formatTime(usageLog.responseTime)}
                                    </Text>
                                </View>
                                <View style={styles.usageItem}>
                                    <Text style={styles.usageLabel}>API Cost</Text>
                                    <Text style={styles.usageValue}>
                                        {formatCurrency(usageLog.apiCost)}
                                    </Text>
                                </View>
                                <View style={styles.usageItem}>
                                    <Text style={styles.usageLabel}>Request Status</Text>
                                    <View style={styles.statusContainer}>
                                        <Ionicons
                                            name={usageLog.success ? "checkmark-circle" : "close-circle"}
                                            size={12}
                                            color={usageLog.success ? "#10b981" : "#ef4444"}
                                        />
                                        <Text style={[
                                            styles.usageValue,
                                            { color: usageLog.success ? "#10b981" : "#ef4444" }
                                        ]}>
                                            {usageLog.success ? "Success" : "Failed"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.tokenComparison}>
                                <Text style={styles.comparisonTitle}>Token Usage Analysis</Text>
                                <View style={styles.tokenBar}>
                                    <View style={styles.tokenBarFill}>
                                        <Animated.View
                                            style={[
                                                styles.tokenBarProgress,
                                                {
                                                    width: `${Math.min((usageLog.tokensUsed || 0) / 10000 * 100, 100)}%`,
                                                    backgroundColor: getTokenUsageColor(usageLog.tokensUsed || 0)
                                                }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.tokenBarText}>
                                        {(usageLog.tokensUsed || 0).toLocaleString()} / 10k tokens
                                    </Text>
                                </View>
                                <Text style={styles.tokenBarSubtext}>
                                    {getTokenUsageMessage(usageLog.tokensUsed || 0)}
                                </Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.noUsageData}>
                            <Ionicons name="information-circle" size={20} color="#9ca3af" />
                            <Text style={styles.noUsageText}>
                                Usage details not available for this analysis
                            </Text>
                        </View>
                    )}
                </Animated.View>
            )}
        </View>
    );
};

// Main component
export default function InspectionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [showImageModal, setShowImageModal] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const {
        loading,
        refreshing,
        error,
        inspectionData,
        usageLogData,
        loadingUsageData,
        handleRefresh,
        fetchInspection
    } = useInspectionData(id);

    // Animations on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim, scaleAnim]);

    // Share inspection summary
    const shareInspection = useCallback(async () => {
        if (!inspectionData) return;

        const { inspection } = inspectionData;
        const analysis = inspection.analysisResults;

        const summary = `HSE Inspection Report
            Date: ${new Date(inspection.createdAt).toLocaleDateString()}
            Risk Score: ${inspection.riskScore || 'N/A'}/100
            Safety Grade: ${inspection.safetyGrade || 'N/A'}
            Hazards Found: ${inspection.hazardCount || 0}
            Status: ${inspection.processingStatus}

            ${analysis?.hazards?.length ?
            `Top Issues:\n${analysis.hazards.slice(0, 3).map(h => `• ${h.description}`).join('\n')}` :
            'No detailed analysis available'}
            Generated by HSE Safety App`;
        try {
            await Share.share({
                message: summary,
                title: 'HSE Inspection Report',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    }, [inspectionData]);

    // Prepare sections data
    const hazardSections = useMemo(() => {
        if (!inspectionData?.inspection?.analysisResults?.hazards?.length) {
            return [];
        }

        const map = new Map<HazardCategory, Hazard[]>();
        for (const hazard of inspectionData.inspection.analysisResults.hazards) {
            const arr = map.get(hazard.category) ?? [];
            arr.push(hazard);
            map.set(hazard.category, arr);
        }

        return Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([title, data]) => ({ title, data }));
    }, [inspectionData]);

    // Render states
    if (loading) {
        return <LoadingCard />;
    }

    if (error) {
        return <ErrorCard error={error} onRetry={() => fetchInspection()} />;
    }

    if (!inspectionData) {
        return <NoDataCard />;
    }

    const { inspection } = inspectionData;
    const analysis = inspection.analysisResults;

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#4f46e5"
                    />
                }
            >
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [
                            { translateY: slideAnim },
                            { scale: scaleAnim }
                        ],
                    }}
                >
                    <InspectionHeader inspection={inspection} onShare={shareInspection} />

                    <ProcessingStatusCard
                        status={inspection.processingStatus}
                        onRefresh={handleRefresh}
                    />

                    <ImagePreviewCard
                        imageUrl={inspection.imageUrl}
                        onPress={() => setShowImageModal(true)}
                    />

                    {inspection.processingStatus === "completed" && analysis ? (
                        <>
                            {/* Overall Assessment Card */}
                            <View style={styles.assessmentCard}>
                                <View style={styles.assessmentHeader}>
                                    <View>
                                        <Text style={styles.assessmentTitle}>Safety Assessment</Text>
                                        <Text style={styles.assessmentSubtitle}>
                                            AI-powered analysis complete
                                        </Text>
                                    </View>
                                    <GradeBadge grade={analysis.overallAssessment.safetyGrade} />
                                </View>

                                {/* Metrics Grid */}
                                <View style={styles.metricsGrid}>
                                    <MetricCard
                                        icon="speedometer"
                                        label="Risk Score"
                                        value={`${analysis.overallAssessment.riskScore}`}
                                        suffix="/100"
                                        color={getRiskScoreColor(analysis.overallAssessment.riskScore)}
                                    />
                                    <MetricCard
                                        icon="warning"
                                        label="Hazards"
                                        value={String(analysis.hazards.length)}
                                        suffix=""
                                        color="#f59e0b"
                                    />
                                    <MetricCard
                                        icon="shield-checkmark"
                                        label="Confidence"
                                        value={`${analysis.metadata.confidence}`}
                                        suffix="%"
                                        color="#10b981"
                                    />
                                </View>

                                {/* Top Priorities */}
                                {analysis.overallAssessment.topPriorities &&
                                    analysis.overallAssessment.topPriorities.length > 0 && (
                                        <View style={styles.prioritiesSection}>
                                            <Text style={styles.prioritiesTitle}>
                                                <Ionicons name="flag" size={16} color="#4f46e5" /> Top Priorities
                                            </Text>
                                            {analysis.overallAssessment.topPriorities.map((priority, index) => (
                                                <View key={index} style={styles.priorityItem}>
                                                    <View style={styles.priorityNumber}>
                                                        <Text style={styles.priorityNumberText}>{index + 1}</Text>
                                                    </View>
                                                    <Text style={styles.priorityText}>{priority}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                {/* Compliance Standards */}
                                {analysis.overallAssessment.complianceStandards &&
                                    analysis.overallAssessment.complianceStandards.length > 0 && (
                                        <View style={styles.complianceSection}>
                                            <Text style={styles.complianceTitle}>
                                                <Ionicons name="checkmark-circle" size={16} color="#10b981" /> Compliance Standards
                                            </Text>
                                            <View style={styles.complianceList}>
                                                {analysis.overallAssessment.complianceStandards.map((standard, index) => (
                                                    <View key={index} style={styles.compliancePill}>
                                                        <Text style={styles.complianceText}>{standard}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                            </View>

                            {/* Hazards by Category */}
                            {hazardSections.length > 0 ? (
                                <View style={styles.hazardsContainer}>
                                    <Text style={styles.hazardsTitle}>Identified Hazards</Text>
                                    {hazardSections.map((section) => (
                                        <View key={section.title} style={styles.categorySection}>
                                            <View style={styles.categoryHeader}>
                                                <Text style={styles.categoryTitle}>
                                                    {getCategoryIcon(section.title)} {section.title}
                                                </Text>
                                                <View style={styles.categoryBadge}>
                                                    <Text style={styles.categoryCount}>
                                                        {section.data.length}
                                                    </Text>
                                                </View>
                                            </View>
                                            {section.data.map((hazard) => (
                                                <HazardCard key={hazard.id} hazard={hazard} />
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.successCard}>
                                    <View style={styles.successIcon}>
                                        <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                                    </View>
                                    <Text style={styles.successTitle}>Excellent Safety Standards!</Text>
                                    <Text style={styles.successText}>
                                        No safety hazards were detected in this inspection.
                                        The workplace meets or exceeds safety requirements.
                                    </Text>
                                    <View style={styles.successBadges}>
                                        <View style={styles.successBadge}>
                                            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                                            <Text style={styles.successBadgeText}>Safe Environment</Text>
                                        </View>
                                        <View style={styles.successBadge}>
                                            <Ionicons name="ribbon" size={20} color="#10b981" />
                                            <Text style={styles.successBadgeText}>Compliant</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                            {/*
                            <AnalysisMetadata
                                analysis={analysis}
                                usageLog={usageLogData}
                                loadingUsage={loadingUsageData}
                            />
                            */}

                        </>
                    ) : inspection.processingStatus === "failed" ? (
                        <View style={styles.failedCard}>
                            <Ionicons name="close-circle" size={64} color="#ef4444" />
                            <Text style={styles.failedTitle}>Analysis Failed</Text>
                            <Text style={styles.failedText}>
                                We couldn't complete the analysis for this inspection.
                                This might be due to image quality or temporary server issues.
                            </Text>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={() => router.back()}
                            >
                                <Text style={styles.primaryButtonText}>Try New Analysis</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.processingCard}>
                            <ActivityIndicator size="large" color="#4f46e5" />
                            <Text style={styles.processingTitle}>Analysis In Progress</Text>
                            <Text style={styles.processingText}>
                                Our AI is analyzing your image for safety hazards.
                                This usually takes 10-30 seconds.
                            </Text>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={handleRefresh}
                            >
                                <Ionicons name="refresh" size={20} color="#4f46e5" />
                                <Text style={styles.refreshButtonText}>Refresh Status</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Image Modal */}
            <Modal
                visible={showImageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowImageModal(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowImageModal(false)}
                            >
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Image
                            source={{ uri: inspection.imageUrl }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}