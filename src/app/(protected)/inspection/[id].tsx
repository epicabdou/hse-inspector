// src/app/(protected)/inspection/[id].tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Share,
    Animated,
    Dimensions,
    Modal,
    TouchableWithoutFeedback,
    RefreshControl,
    ViewStyle,
    TextStyle,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSession } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import CustomButton from '@/components/CustomButton';
import FloatingActions from '@/components/FloatingActions';

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

    const { session } = useSession();
    const { buildAuthHeaders } = useAuthHeaders();

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

    return {
        loading,
        refreshing,
        error,
        inspectionData,
        handleRefresh,
        fetchInspection
    };
};

// Utility functions
const getRiskScoreColor = (score: number, colors: any): string => {
    if (score >= 80) return colors.error;
    if (score >= 60) return "#ea580c";
    if (score >= 40) return colors.warning;
    return colors.success;
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

const getSeverityColors = (colors: any) => ({
    Critical: colors.error,
    High: "#dc2626",
    Medium: colors.warning,
    Low: colors.success,
});

const getGradeColors = () => ({
    A: "#10b981",
    B: "#3b82f6",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
});

// Components
const LoadingCard: React.FC = () => {
    const { colors } = useTheme();

    return (
        <View style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
            paddingHorizontal: 20,
        }}>
            <FloatingActions />
            <View style={{
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: 40,
                alignItems: "center",
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 5,
                maxWidth: 300,
                borderWidth: 1,
                borderColor: colors.border,
            }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.text,
                    marginTop: 16,
                    marginBottom: 4,
                }}>Loading Inspection</Text>
                <Text style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                }}>Fetching analysis details...</Text>
            </View>
        </View>
    );
};

const ErrorCard: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
    const { colors } = useTheme();

    return (
        <View style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
            paddingHorizontal: 20,
        }}>
            <FloatingActions />
            <View style={{
                backgroundColor: colors.surface,
                borderRadius: 24,
                padding: 32,
                alignItems: "center",
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 5,
                maxWidth: 340,
                borderWidth: 1,
                borderColor: colors.border,
            }}>
                <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: colors.errorBackground,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 20,
                }}>
                    <Ionicons name="alert-circle" size={48} color={colors.error} />
                </View>
                <Text style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 8,
                }}>Unable to Load</Text>
                <Text style={{
                    fontSize: 15,
                    color: colors.textSecondary,
                    textAlign: "center",
                    lineHeight: 22,
                    marginBottom: 24,
                }}>{error}</Text>
                <View style={{ gap: 12, width: "100%" }}>
                    <CustomButton
                        text="Try Again"
                        onPress={onRetry}
                        icon={<Ionicons name="refresh" size={20} color="#fff" />}
                    />
                    <CustomButton
                        text="Go Back"
                        variant="outline"
                        onPress={() => router.back()}
                        icon={<Ionicons name="arrow-back" size={20} color={colors.primary} />}
                    />
                </View>
            </View>
        </View>
    );
};

const ProcessingStatusCard: React.FC<{
    status: ProcessingStatus;
    onRefresh: () => void;
}> = ({ status, onRefresh }) => {
    const { colors } = useTheme();

    const getStatusInfo = useCallback((status: ProcessingStatus) => {
        const statusMap = {
            completed: {
                icon: "checkmark-circle" as const,
                color: colors.success,
                bgColor: colors.successBackground,
                text: "Analysis Complete",
                subtitle: "Safety assessment ready"
            },
            processing: {
                icon: "sync" as const,
                color: colors.warning,
                bgColor: colors.warningBackground,
                text: "Processing...",
                subtitle: "AI analyzing image"
            },
            pending: {
                icon: "hourglass" as const,
                color: colors.textTertiary,
                bgColor: colors.backgroundTertiary,
                text: "Pending Analysis",
                subtitle: "Waiting in queue"
            },
            failed: {
                icon: "alert-circle" as const,
                color: colors.error,
                bgColor: colors.errorBackground,
                text: "Analysis Failed",
                subtitle: "Unable to process"
            }
        };
        return statusMap[status];
    }, [colors]);

    const statusInfo = getStatusInfo(status);

    return (
        <View style={{
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            backgroundColor: statusInfo.bgColor,
            borderWidth: 1,
            borderColor: statusInfo.color + '20',
        }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: statusInfo.color + '15',
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                }}>
                    <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: statusInfo.color,
                    }}>{statusInfo.text}</Text>
                    <Text style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 2,
                    }}>{statusInfo.subtitle}</Text>
                </View>
                {status === "processing" && (
                    <TouchableOpacity onPress={onRefresh} style={{ padding: 8 }}>
                        <Ionicons name="refresh" size={20} color={statusInfo.color} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const ImagePreviewCard: React.FC<{
    imageUrl: string;
    onPress: () => void;
}> = ({ imageUrl, onPress }) => {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={{
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: colors.surface,
                marginBottom: 16,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 5,
                borderWidth: 1,
                borderColor: colors.border,
            }}
            onPress={onPress}
            activeOpacity={0.95}
        >
            <Image
                source={{ uri: imageUrl }}
                style={{
                    width: "100%",
                    height: 260,
                    backgroundColor: colors.backgroundTertiary,
                }}
                resizeMode="cover"
            />
            <View style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                backgroundColor: "rgba(0,0,0,0.6)",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                }}>
                    <Ionicons name="expand" size={20} color="#fff" />
                    <Text style={{
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: "600",
                    }}>Tap to expand</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const GradeBadge: React.FC<{ grade: SafetyGrade }> = ({ grade }) => {
    const colors = getGradeColors();

    return (
        <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors[grade],
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        }}>
            <Text style={{
                fontSize: 28,
                fontWeight: "800",
                color: "#fff",
            }}>{grade}</Text>
        </View>
    );
};

const MetricCard: React.FC<{
    icon: string;
    label: string;
    value: string;
    suffix: string;
    color: string;
}> = ({ icon, label, value, suffix, color }) => {
    const { colors } = useTheme();

    return (
        <View style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
        }}>
            <Ionicons name={icon as any} size={24} color={color} />
            <View style={{ alignItems: "center", marginTop: 8 }}>
                <Text style={{
                    fontSize: 22,
                    fontWeight: "700",
                    marginBottom: 4,
                    color: color,
                }}>
                    {value}<Text style={{ fontSize: 14, fontWeight: "400" }}>{suffix}</Text>
                </Text>
                <Text style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                }}>{label}</Text>
            </View>
        </View>
    );
};

const HazardCard: React.FC<{ hazard: Hazard }> = ({ hazard }) => {
    const { colors } = useTheme();
    const severityColors = getSeverityColors(colors);

    return (
        <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: colors.border,
        }}>
            <View style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
            }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: colors.text,
                        marginBottom: 6,
                    }}>{hazard.description}</Text>
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                    }}>
                        <Ionicons name="location" size={14} color={colors.textSecondary} />
                        <Text style={{
                            fontSize: 13,
                            color: colors.textSecondary,
                        }}>{hazard.location}</Text>
                    </View>
                </View>
                <View style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: severityColors[hazard.severity] + '15',
                    alignSelf: "flex-start",
                }}>
                    <Text style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: severityColors[hazard.severity],
                    }}>{hazard.severity}</Text>
                </View>
            </View>

            <View style={{
                flexDirection: "row",
                gap: 16,
                marginBottom: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
            }}>
                <View style={{ flex: 1 }}>
                    <Text style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                    }}>Priority</Text>
                    <View style={{
                        height: 6,
                        backgroundColor: colors.border,
                        borderRadius: 3,
                        marginVertical: 4,
                        overflow: "hidden",
                    }}>
                        <Animated.View style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${hazard.priority * 10}%`,
                            backgroundColor: hazard.priority > 7 ? colors.error : hazard.priority > 4 ? colors.warning : colors.success,
                        }} />
                    </View>
                    <Text style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.text,
                    }}>{hazard.priority}/10</Text>
                </View>

                {hazard.estimatedCost && (
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            fontSize: 11,
                            color: colors.textSecondary,
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                        }}>Cost</Text>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                        }}>{hazard.estimatedCost}</Text>
                    </View>
                )}

                {hazard.timeToImplement && (
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            fontSize: 11,
                            color: colors.textSecondary,
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                        }}>Timeline</Text>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                        }}>{hazard.timeToImplement}</Text>
                    </View>
                )}
            </View>

            <View style={{ gap: 16 }}>
                <View style={{
                    backgroundColor: colors.backgroundTertiary,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                }}>
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                    }}>
                        <Ionicons name="flash" size={16} color={colors.error} />
                        <Text style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                        }}>Immediate Actions</Text>
                    </View>
                    {hazard.immediateSolutions.map((solution, index) => (
                        <View key={`immediate-${index}`} style={{
                            flexDirection: "row",
                            marginBottom: 8,
                        }}>
                            <View style={{ width: 20, marginTop: 2 }}>
                                <Text style={{
                                    fontSize: 14,
                                    color: colors.textSecondary,
                                }}>•</Text>
                            </View>
                            <Text style={{
                                flex: 1,
                                fontSize: 14,
                                color: colors.textSecondary,
                                lineHeight: 20,
                            }}>{solution}</Text>
                        </View>
                    ))}
                </View>

                <View style={{
                    backgroundColor: colors.backgroundTertiary,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                }}>
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                    }}>
                        <Ionicons name="calendar" size={16} color={colors.primary} />
                        <Text style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                        }}>Long-term Solutions</Text>
                    </View>
                    {hazard.longTermSolutions.map((solution, index) => (
                        <View key={`longterm-${index}`} style={{
                            flexDirection: "row",
                            marginBottom: 8,
                        }}>
                            <View style={{ width: 20, marginTop: 2 }}>
                                <Text style={{
                                    fontSize: 14,
                                    color: colors.textSecondary,
                                }}>•</Text>
                            </View>
                            <Text style={{
                                flex: 1,
                                fontSize: 14,
                                color: colors.textSecondary,
                                lineHeight: 20,
                            }}>{solution}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

// Main component
export default function InspectionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors } = useTheme();
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
        return <LoadingCard />;
    }

    const { inspection } = inspectionData;
    const analysis = inspection.analysisResults;

    return (
        <>
            <View style={{
                flex: 1,
                backgroundColor: colors.background,
            }}>
                <FloatingActions />
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingTop: Platform.select({ ios: 60, android: 40, default: 40 }),
                        paddingHorizontal: 16,
                        paddingBottom: 80,
                    }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
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
                        {/* Header */}
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 20,
                            backgroundColor: colors.surface,
                            borderRadius: 20,
                            padding: 16,
                            shadowColor: colors.shadow,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 3,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: colors.backgroundTertiary,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </TouchableOpacity>

                            <View style={{ flex: 1, marginHorizontal: 16 }}>
                                <Text style={{
                                    fontSize: 22,
                                    fontWeight: "800",
                                    color: colors.text,
                                }}>Inspection Report</Text>
                                <Text style={{
                                    fontSize: 14,
                                    color: colors.textSecondary,
                                    marginTop: 2,
                                }}>
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
                                onPress={shareInspection}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: colors.backgroundTertiary,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Ionicons name="share-outline" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

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
                                <View style={{
                                    backgroundColor: colors.surface,
                                    borderRadius: 20,
                                    padding: 20,
                                    marginBottom: 16,
                                    shadowColor: colors.shadow,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 12,
                                    elevation: 5,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}>
                                    <View style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 20,
                                    }}>
                                        <View>
                                            <Text style={{
                                                fontSize: 20,
                                                fontWeight: "700",
                                                color: colors.text,
                                            }}>Safety Assessment</Text>
                                            <Text style={{
                                                fontSize: 14,
                                                color: colors.textSecondary,
                                                marginTop: 2,
                                            }}>AI-powered analysis complete</Text>
                                        </View>
                                        <GradeBadge grade={analysis.overallAssessment.safetyGrade} />
                                    </View>

                                    {/* Metrics Grid */}
                                    <View style={{ flexDirection: "row", gap: 12 }}>
                                        <MetricCard
                                            icon="speedometer"
                                            label="Risk Score"
                                            value={`${analysis.overallAssessment.riskScore}`}
                                            suffix="/100"
                                            color={getRiskScoreColor(analysis.overallAssessment.riskScore, colors)}
                                        />
                                        <MetricCard
                                            icon="warning"
                                            label="Hazards"
                                            value={String(analysis.hazards.length)}
                                            suffix=""
                                            color={colors.warning}
                                        />
                                        <MetricCard
                                            icon="shield-checkmark"
                                            label="Confidence"
                                            value={`${analysis.metadata.confidence}`}
                                            suffix="%"
                                            color={colors.success}
                                        />
                                    </View>

                                    {/* Top Priorities */}
                                    {analysis.overallAssessment.topPriorities &&
                                        analysis.overallAssessment.topPriorities.length > 0 && (
                                            <View style={{
                                                marginTop: 20,
                                                paddingTop: 20,
                                                borderTopWidth: 1,
                                                borderTopColor: colors.borderLight,
                                            }}>
                                                <Text style={{
                                                    fontSize: 16,
                                                    fontWeight: "600",
                                                    color: colors.text,
                                                    marginBottom: 12,
                                                }}>
                                                    <Ionicons name="flag" size={16} color={colors.primary} /> Top Priorities
                                                </Text>
                                                {analysis.overallAssessment.topPriorities.map((priority, index) => (
                                                    <View key={index} style={{
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        gap: 12,
                                                        marginBottom: 10,
                                                    }}>
                                                        <View style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 14,
                                                            backgroundColor: colors.primary,
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                        }}>
                                                            <Text style={{
                                                                color: "#fff",
                                                                fontSize: 12,
                                                                fontWeight: "700",
                                                            }}>{index + 1}</Text>
                                                        </View>
                                                        <Text style={{
                                                            flex: 1,
                                                            fontSize: 14,
                                                            color: colors.text,
                                                            lineHeight: 20,
                                                        }}>{priority}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                    {/* Compliance Standards */}
                                    {analysis.overallAssessment.complianceStandards &&
                                        analysis.overallAssessment.complianceStandards.length > 0 && (
                                            <View style={{
                                                marginTop: 20,
                                                paddingTop: 20,
                                                borderTopWidth: 1,
                                                borderTopColor: colors.borderLight,
                                            }}>
                                                <Text style={{
                                                    fontSize: 16,
                                                    fontWeight: "600",
                                                    color: colors.text,
                                                    marginBottom: 12,
                                                }}>
                                                    <Ionicons name="checkmark-circle" size={16} color={colors.success} /> Compliance Standards
                                                </Text>
                                                <View style={{
                                                    flexDirection: "row",
                                                    flexWrap: "wrap",
                                                    gap: 8,
                                                }}>
                                                    {analysis.overallAssessment.complianceStandards.map((standard, index) => (
                                                        <View key={index} style={{
                                                            backgroundColor: colors.successBackground,
                                                            borderColor: colors.success,
                                                            borderWidth: 1,
                                                            borderRadius: 20,
                                                            paddingHorizontal: 14,
                                                            paddingVertical: 6,
                                                        }}>
                                                            <Text style={{
                                                                color: colors.success,
                                                                fontSize: 13,
                                                                fontWeight: "600",
                                                            }}>{standard}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                </View>

                                {/* Hazards by Category */}
                                {hazardSections.length > 0 ? (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{
                                            fontSize: 22,
                                            fontWeight: "700",
                                            color: colors.text,
                                            marginBottom: 16,
                                        }}>Identified Hazards</Text>
                                        {hazardSections.map((section) => (
                                            <View key={section.title} style={{ marginBottom: 20 }}>
                                                <View style={{
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    marginBottom: 12,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 18,
                                                        fontWeight: "700",
                                                        color: colors.text,
                                                    }}>
                                                        {getCategoryIcon(section.title)} {section.title}
                                                    </Text>
                                                    <View style={{
                                                        backgroundColor: colors.backgroundTertiary,
                                                        borderRadius: 12,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 4,
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 14,
                                                            fontWeight: "600",
                                                            color: colors.textSecondary,
                                                        }}>{section.data.length}</Text>
                                                    </View>
                                                </View>
                                                {section.data.map((hazard) => (
                                                    <HazardCard key={hazard.id} hazard={hazard} />
                                                ))}
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={{
                                        backgroundColor: colors.successBackground,
                                        borderRadius: 20,
                                        padding: 32,
                                        alignItems: "center",
                                        marginBottom: 16,
                                        borderWidth: 1,
                                        borderColor: colors.success + '30',
                                    }}>
                                        <View style={{ marginBottom: 16 }}>
                                            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                                        </View>
                                        <Text style={{
                                            fontSize: 22,
                                            fontWeight: "700",
                                            color: colors.success,
                                            marginBottom: 8,
                                        }}>Excellent Safety Standards!</Text>
                                        <Text style={{
                                            fontSize: 15,
                                            color: colors.success,
                                            textAlign: "center",
                                            lineHeight: 22,
                                            marginBottom: 20,
                                        }}>
                                            No safety hazards were detected in this inspection.
                                            The workplace meets or exceeds safety requirements.
                                        </Text>
                                        <View style={{ flexDirection: "row", gap: 12 }}>
                                            <View style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 6,
                                                backgroundColor: colors.surface,
                                                paddingHorizontal: 14,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: colors.success,
                                            }}>
                                                <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                                                <Text style={{
                                                    fontSize: 13,
                                                    fontWeight: "600",
                                                    color: colors.success,
                                                }}>Safe Environment</Text>
                                            </View>
                                            <View style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 6,
                                                backgroundColor: colors.surface,
                                                paddingHorizontal: 14,
                                                paddingVertical: 8,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: colors.success,
                                            }}>
                                                <Ionicons name="ribbon" size={20} color={colors.success} />
                                                <Text style={{
                                                    fontSize: 13,
                                                    fontWeight: "600",
                                                    color: colors.success,
                                                }}>Compliant</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </>
                        ) : inspection.processingStatus === "failed" ? (
                            <View style={{
                                backgroundColor: colors.errorBackground,
                                borderRadius: 20,
                                padding: 32,
                                alignItems: "center",
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: colors.error + '30',
                            }}>
                                <Ionicons name="close-circle" size={64} color={colors.error} />
                                <Text style={{
                                    fontSize: 22,
                                    fontWeight: "700",
                                    color: colors.error,
                                    marginTop: 16,
                                    marginBottom: 8,
                                }}>Analysis Failed</Text>
                                <Text style={{
                                    fontSize: 15,
                                    color: colors.error,
                                    textAlign: "center",
                                    lineHeight: 22,
                                    marginBottom: 24,
                                }}>
                                    We couldn't complete the analysis for this inspection.
                                    This might be due to image quality or temporary server issues.
                                </Text>
                                <CustomButton
                                    text="Try New Analysis"
                                    onPress={() => router.back()}
                                />
                            </View>
                        ) : (
                            <View style={{
                                backgroundColor: colors.warningBackground,
                                borderRadius: 20,
                                padding: 32,
                                alignItems: "center",
                                marginBottom: 16,
                                borderWidth: 1,
                                borderColor: colors.warning + '30',
                            }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={{
                                    fontSize: 22,
                                    fontWeight: "700",
                                    color: colors.warning,
                                    marginTop: 16,
                                    marginBottom: 8,
                                }}>Analysis In Progress</Text>
                                <Text style={{
                                    fontSize: 15,
                                    color: colors.warning,
                                    textAlign: "center",
                                    lineHeight: 22,
                                    marginBottom: 24,
                                }}>
                                    Our AI is analyzing your image for safety hazards.
                                    This usually takes 10-30 seconds.
                                </Text>
                                <CustomButton
                                    text="Refresh Status"
                                    variant="outline"
                                    onPress={handleRefresh}
                                    icon={<Ionicons name="refresh" size={20} color={colors.primary} />}
                                />
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </View>

            {/* Image Modal */}
            <Modal
                visible={showImageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowImageModal(false)}>
                    <View style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.95)",
                        justifyContent: "center",
                        alignItems: "center",
                    }}>
                        <View style={{
                            position: "absolute",
                            top: Platform.select({ ios: 60, android: 40, default: 40 }),
                            right: 20,
                            zIndex: 10,
                        }}>
                            <TouchableOpacity
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    backgroundColor: "rgba(255,255,255,0.1)",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                                onPress={() => setShowImageModal(false)}
                            >
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Image
                            source={{ uri: inspection.imageUrl }}
                            style={{
                                width: screenWidth * 0.95,
                                height: "80%",
                            }}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}