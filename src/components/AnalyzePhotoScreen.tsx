// src/components/AnalyzePhotoScreen.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Pressable,
    Animated,
    Dimensions,
    Modal,
    TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSession } from '@clerk/clerk-expo';
import { router } from "expo-router";
// Add icon imports if using expo-vector-icons
// import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Enhanced AnalyzePhotoScreen with improved styling
 * Features:
 * - Modern gradient backgrounds
 * - Smooth animations
 * - Better visual hierarchy
 * - Glass morphism effects
 * - Improved spacing and typography
 */

// ----- Types -----
type HazardCategory =
    | "PPE"
    | "Fall"
    | "Fire"
    | "Electrical"
    | "Chemical"
    | "Machinery"
    | "Environmental"
    | "Other";

type Severity = "Critical" | "High" | "Medium" | "Low";
type SafetyGrade = "A" | "B" | "C" | "D" | "F";

type Hazard = {
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
};

type Overall = {
    riskScore: number;
    safetyGrade: SafetyGrade;
    topPriorities: string[];
    complianceStandards?: string[];
};

type AnalysisResult = {
    hazards: Hazard[];
    overallAssessment: Overall;
    metadata: { analysisTime: number; tokensUsed: number; confidence: number };
};

interface AnalyzeResponse {
    ok: boolean;
    inspection: {
        id: string;
        createdAt: string;
        imageUrl: string;
        hazardCount: number;
        riskScore: number;
        safetyGrade: SafetyGrade;
    };
    analysis: AnalysisResult;
    usage?: any;
}

interface ListResponse {
    ok: boolean;
    inspections: Array<{
        id: string;
        createdAt: string;
        imageUrl: string;
        hazardCount: number | null;
        riskScore: number | null;
        safetyGrade: SafetyGrade | null;
    }>;
    page: number;
    pageSize: number;
}

export type AnalyzePhotoScreenProps = {
    apiBaseUrl?: string;
    tokenTemplate?: string;
};

const DEFAULT_BASE = "https://hseappapi.vercel.app";
const PAGE_SIZE = 10;

const AnalyzePhotoScreen: React.FC<AnalyzePhotoScreenProps> = ({
                                                                   apiBaseUrl = DEFAULT_BASE,
                                                                   tokenTemplate,
                                                               }) => {
    const { session } = useSession();

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // image state
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>("image/jpeg");
    const [showImageModal, setShowImageModal] = useState(false);

    // progress state
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    // result/error
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    // recent inspections
    const [listLoading, setListLoading] = useState(false);
    const [recent, setRecent] = useState<ListResponse["inspections"]>([]);

    const hasImage = !!imageUri && !!imageBase64;

    // Animations on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Get authentication token from Clerk session
    const getAuthToken = async (): Promise<string | null> => {
        if (!session) {
            console.warn("No active Clerk session found.");
            return null;
        }

        try {
            const token = await session.getToken(tokenTemplate ? { template: tokenTemplate } : undefined);
            return token;
        } catch (error) {
            console.error("Error getting Clerk token:", error);
            return null;
        }
    };

    // Build auth headers with JWT token
    const buildAuthHeaders = async (init?: Record<string, string>) => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(init || {})
        };

        const token = await getAuthToken();

        if (!token) {
            throw new Error(
                "Authentication required. Please ensure you're logged in with Clerk."
            );
        }

        headers["Authorization"] = `Bearer ${token}`;
        return headers;
    };

    // Optional client-side compression
    async function compressClientSide(uri: string, maxSide = 1600, quality = 0.7) {
        const r = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: maxSide } }],
            { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        return {
            uri: r.uri,
            mime: "image/jpeg",
            base64: r.base64 ?? null,
            approxBytes: r.base64 ? Math.floor(r.base64.length * 0.75) : 0,
        };
    }

    // Camera
    const handleTakePhoto = async () => {
        setError(null);
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (cam.status !== "granted") {
            Alert.alert("Permission needed", "Camera permission is required.");
            return;
        }

        const res = await ImagePicker.launchCameraAsync({
            quality: 0.9,
            base64: true,
            exif: false,
            allowsEditing: false,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
        if (res.canceled) return;
        const asset = res.assets?.[0];
        if (!asset?.uri) return;

        let b64 = asset.base64 ?? null;
        let mt = asset.mimeType || guessMimeFromUri(asset.uri) || "image/jpeg";
        if (!b64 || (b64.length * 0.75) > 3_000_000) {
            const c = await compressClientSide(asset.uri);
            b64 = c.base64;
            mt = c.mime;
        }

        if (b64) {
            setImageUri(asset.uri);
            setImageBase64(b64);
            setMimeType(mt);
            setResult(null);
        }
    };

    // Gallery
    const handlePickFromGallery = async () => {
        setError(null);
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (lib.status !== "granted") {
            Alert.alert("Permission needed", "Photo library permission is required.");
            return;
        }

        const res = await ImagePicker.launchImageLibraryAsync({
            quality: 0.9,
            base64: true,
            exif: false,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
        if (res.canceled) return;
        const asset = res.assets?.[0];
        if (!asset?.uri) return;

        let b64 = asset.base64 ?? null;
        let mt = asset.mimeType || guessMimeFromUri(asset.uri) || "image/jpeg";
        if (!b64 || (b64.length * 0.75) > 3_000_000) {
            const c = await compressClientSide(asset.uri);
            b64 = c.base64;
            mt = c.mime;
        }

        if (b64) {
            setImageUri(asset.uri);
            setImageBase64(b64);
            setMimeType(mt);
            setResult(null);
        }
    };

    // Upload → Analyze
    const analyze = async () => {
        if (!hasImage) {
            Alert.alert("No image", "Please take or select a photo first.");
            return;
        }

        if (!session) {
            Alert.alert("Authentication Required", "Please sign in to analyze photos.");
            return;
        }

        setError(null);
        setResult(null);

        try {
            // 1) Upload to server
            setUploading(true);
            const uploadHeaders = await buildAuthHeaders();
            const uploadResp = await fetch(`${apiBaseUrl}/api/uploads/base64`, {
                method: "POST",
                headers: uploadHeaders,
                body: JSON.stringify({
                    base64: imageBase64,
                    filename: "inspection",
                }),
            });

            if (!uploadResp.ok) {
                const text = await uploadResp.text();
                if (uploadResp.status === 401) {
                    throw new Error("Authentication failed. Please sign in again.");
                }
                if (uploadResp.status === 413) {
                    throw new Error("Image too large for server. Please try a smaller photo.");
                }
                throw new Error(`Upload failed (${uploadResp.status}): ${text.slice(0, 300)}`);
            }

            const upJson = await uploadResp.json();
            if (!upJson?.ok || !upJson?.url) throw new Error("Upload response missing URL.");

            const imageUrl: string = upJson.url;
            setUploading(false);

            // 2) Analyze by URL
            setAnalyzing(true);
            const analyzeHeaders = await buildAuthHeaders();
            const analyzeResp = await fetch(`${apiBaseUrl}/api/inspections/analyze`, {
                method: "POST",
                headers: analyzeHeaders,
                body: JSON.stringify({ imageUrl }),
            });

            const ct = analyzeResp.headers.get("content-type") || "";
            const isJson = ct.includes("application/json");

            if (!analyzeResp.ok) {
                const text = await analyzeResp.text();
                if (analyzeResp.status === 401) {
                    throw new Error("Authentication failed. Please sign in again.");
                }
                throw new Error(`Analyze failed (${analyzeResp.status}): ${text.slice(0, 400)}`);
            }

            const json: AnalyzeResponse = isJson
                ? await analyzeResp.json()
                : JSON.parse(await analyzeResp.text());

            if (!json?.ok || !json?.analysis) throw new Error("Unexpected analyze response");

            setResult(json.analysis);
            fetchRecent();
        } catch (e: any) {
            setError(e?.message || "Failed to analyze image.");
        } finally {
            setUploading(false);
            setAnalyzing(false);
        }
    };

    // Recent inspections
    const fetchRecent = async () => {
        if (!session) return;

        try {
            setListLoading(true);
            const headers = await buildAuthHeaders();
            const resp = await fetch(
                `${apiBaseUrl}/api/inspections/list?page=1&pageSize=${PAGE_SIZE}`,
                { headers }
            );
            if (!resp.ok) return;
            const json: ListResponse = await resp.json();
            if (json?.ok) setRecent(json.inspections);
        } catch (e) {
            console.warn("Failed to fetch recent inspections:", e);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchRecent();
        }
    }, [session]);

    // Group hazards for sections
    const sections = useMemo(() => {
        if (!result?.hazards?.length) return [];
        const map = new Map<HazardCategory, Hazard[]>();
        for (const h of result.hazards) {
            const arr = map.get(h.category) ?? [];
            arr.push(h);
            map.set(h.category, arr);
        }
        return Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([title, data]) => ({ title, data }));
    }, [result]);

    // Show login message if no session
    if (!session) {
        return (
            <View style={[styles.container, styles.centeredContent]}>
                <View style={styles.authCard}>
                    <View style={styles.iconContainer}>
                        <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                    <Text style={styles.authTitle}>Authentication Required</Text>
                    <Text style={styles.authSubtitle}>
                        Please sign in to access the AI-powered safety analysis features
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
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
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Safety Analysis</Text>
                        <Text style={styles.headerSubtitle}>AI-powered hazard detection</Text>
                    </View>

                    {/* Step 2 — Take/Upload Photo */}
                    <StepCard
                        number="2"
                        title="Capture Image"
                        description="Take a photo or select from gallery"
                    >
                        <View style={styles.buttonRow}>
                            <ActionButton
                                icon="📷"
                                title="Camera"
                                subtitle="Take photo"
                                onPress={handleTakePhoto}
                                primary
                            />
                            <ActionButton
                                icon="🖼️"
                                title="Gallery"
                                subtitle="Choose photo"
                                onPress={handlePickFromGallery}
                            />
                        </View>

                        {imageUri ? (
                            <Pressable
                                style={styles.imagePreviewCard}
                                onPress={() => setShowImageModal(true)}
                            >
                                <Image
                                    source={{ uri: imageUri }}
                                    style={styles.imagePreview}
                                    resizeMode="cover"
                                />
                                <View style={styles.imageOverlay}>
                                    <Text style={styles.imageOverlayText}>Tap to enlarge</Text>
                                </View>
                            </Pressable>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateIcon}>📸</Text>
                                <Text style={styles.emptyStateText}>No image selected</Text>
                            </View>
                        )}
                    </StepCard>

                    {/* Step 3 — AI Analysis */}
                    <StepCard
                        number="3"
                        title="AI Analysis"
                        description="Process image for safety hazards"
                    >
                        <TouchableOpacity
                            onPress={analyze}
                            disabled={!hasImage || uploading || analyzing}
                            style={[
                                styles.analyzeButton,
                                (!hasImage || uploading || analyzing) && styles.analyzeButtonDisabled
                            ]}
                        >
                            {(uploading || analyzing) ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.analyzeButtonIcon}>🔍</Text>
                            )}
                            <Text style={styles.analyzeButtonText}>
                                {uploading ? "Uploading..." : analyzing ? "Analyzing..." : "Start Analysis"}
                            </Text>
                        </TouchableOpacity>

                        {error && (
                            <View style={styles.errorCard}>
                                <Text style={styles.errorIcon}>⚠️</Text>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </StepCard>

                    {/* Step 4 — View Results */}
                    {result && (
                        <StepCard
                            number="4"
                            title="Analysis Results"
                            description="Safety assessment complete"
                        >
                            <View style={styles.assessmentCard}>
                                <View style={styles.assessmentHeader}>
                                    <Text style={styles.assessmentTitle}>Overall Assessment</Text>
                                    <GradeBadge grade={result.overallAssessment.safetyGrade} />
                                </View>

                                <View style={styles.metricsGrid}>
                                    <MetricCard
                                        icon="⚡"
                                        label="Risk Score"
                                        value={String(result.overallAssessment.riskScore)}
                                        color="#ef4444"
                                    />
                                    <MetricCard
                                        icon="🛡️"
                                        label="Confidence"
                                        value={`${result.metadata.confidence}%`}
                                        color="#10b981"
                                    />
                                    <MetricCard
                                        icon="⚠️"
                                        label="Hazards"
                                        value={String(result.hazards.length)}
                                        color="#f59e0b"
                                    />
                                </View>
                            </View>

                            {/* Hazard Categories */}
                            {sections.map((section) => (
                                <View key={section.title} style={styles.hazardSection}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>
                                            {getCategoryIcon(section.title)} {section.title}
                                        </Text>
                                        <Text style={styles.sectionCount}>
                                            {section.data.length} issue{section.data.length !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    {section.data.map((hazard) => (
                                        <EnhancedHazardCard key={hazard.id} hazard={hazard} />
                                    ))}
                                </View>
                            ))}
                        </StepCard>
                    )}

                    {/* Recent Analyses */}
                    {recent.length > 0 && (
                        <View style={styles.recentSection}>
                            <Text style={styles.recentTitle}>Recent Analyses</Text>
                            <FlatList
                                data={recent}
                                keyExtractor={(item) => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recentList}
                                renderItem={({ item }) => (
                                    <RecentCard item={item} onPress={() => router.push(`/inspection/${item.id}`)} />
                                )}
                            />
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
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
};

export default AnalyzePhotoScreen;

/* -------------------- UI Components -------------------- */
function StepCard({
                      number,
                      title,
                      description,
                      children
                  }: {
    number: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{number}</Text>
                </View>
                <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{title}</Text>
                    <Text style={styles.stepDescription}>{description}</Text>
                </View>
            </View>
            <View style={styles.stepContent}>{children}</View>
        </View>
    );
}

function ActionButton({
                          icon,
                          title,
                          subtitle,
                          onPress,
                          primary = false
                      }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    primary?: boolean;
}) {
    return (
        <TouchableOpacity
            style={[styles.actionButton, primary && styles.actionButtonPrimary]}
            onPress={onPress}
        >
            <Text style={styles.actionButtonIcon}>{icon}</Text>
            <Text style={[styles.actionButtonTitle, primary && styles.actionButtonTitlePrimary]}>
                {title}
            </Text>
            <Text style={[styles.actionButtonSubtitle, primary && styles.actionButtonSubtitlePrimary]}>
                {subtitle}
            </Text>
        </TouchableOpacity>
    );
}

function MetricCard({
                        icon,
                        label,
                        value,
                        color
                    }: {
    icon: string;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <View style={styles.metricCard}>
            <Text style={[styles.metricIcon, { color }]}>{icon}</Text>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function GradeBadge({ grade }: { grade: SafetyGrade }) {
    const colors = {
        A: "#10b981",
        B: "#3b82f6",
        C: "#f59e0b",
        D: "#f97316",
        F: "#ef4444",
    };

    return (
        <View style={[styles.gradeBadge, { backgroundColor: colors[grade] }]}>
            <Text style={styles.gradeBadgeText}>{grade}</Text>
        </View>
    );
}

function EnhancedHazardCard({ hazard }: { hazard: Hazard }) {
    const severityColors = {
        Critical: "#991b1b",
        High: "#dc2626",
        Medium: "#f59e0b",
        Low: "#16a34a",
    };

    return (
        <View style={styles.hazardCard}>
            <View style={styles.hazardHeader}>
                <View style={styles.hazardTitleSection}>
                    <Text style={styles.hazardTitle}>{hazard.description}</Text>
                    <Text style={styles.hazardLocation}>📍 {hazard.location}</Text>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: `${severityColors[hazard.severity]}15` }]}>
                    <Text style={[styles.severityText, { color: severityColors[hazard.severity] }]}>
                        {hazard.severity}
                    </Text>
                </View>
            </View>

            <View style={styles.hazardMetrics}>
                <View style={styles.hazardMetric}>
                    <Text style={styles.hazardMetricLabel}>Priority</Text>
                    <View style={styles.priorityBar}>
                        <View
                            style={[
                                styles.priorityFill,
                                {
                                    width: `${hazard.priority * 10}%`,
                                    backgroundColor: hazard.priority > 7 ? '#ef4444' : hazard.priority > 4 ? '#f59e0b' : '#10b981'
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
                        <Text style={styles.hazardMetricLabel}>Time</Text>
                        <Text style={styles.hazardMetricValue}>{hazard.timeToImplement}</Text>
                    </View>
                )}
            </View>

            <View style={styles.solutionsContainer}>
                <View style={styles.solutionSection}>
                    <Text style={styles.solutionTitle}>🚨 Immediate Actions</Text>
                    {hazard.immediateSolutions.map((solution, index) => (
                        <View key={`immediate-${index}`} style={styles.solutionItem}>
                            <Text style={styles.solutionBullet}>•</Text>
                            <Text style={styles.solutionText}>{solution}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.solutionSection}>
                    <Text style={styles.solutionTitle}>📋 Long-term Solutions</Text>
                    {hazard.longTermSolutions.map((solution, index) => (
                        <View key={`longterm-${index}`} style={styles.solutionItem}>
                            <Text style={styles.solutionBullet}>•</Text>
                            <Text style={styles.solutionText}>{solution}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

function RecentCard({
                        item,
                        onPress
                    }: {
    item: ListResponse["inspections"][0];
    onPress: () => void;
}) {
    return (
        <Pressable style={styles.recentCard} onPress={onPress}>
            <Image source={{ uri: item.imageUrl }} style={styles.recentImage} resizeMode="cover" />
            <View style={styles.recentContent}>
                <View style={styles.recentStats}>
                    <View style={styles.recentStat}>
                        <Text style={styles.recentStatValue}>{item.riskScore ?? "-"}</Text>
                        <Text style={styles.recentStatLabel}>Risk</Text>
                    </View>
                    <View style={styles.recentDivider} />
                    <View style={styles.recentStat}>
                        <Text style={styles.recentStatValue}>{item.hazardCount ?? "-"}</Text>
                        <Text style={styles.recentStatLabel}>Hazards</Text>
                    </View>
                    <View style={styles.recentDivider} />
                    <View style={styles.recentStat}>
                        <Text style={styles.recentStatValue}>{item.safetyGrade ?? "-"}</Text>
                        <Text style={styles.recentStatLabel}>Grade</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.recentButton} onPress={onPress}>
                    <Text style={styles.recentButtonText}>View Details →</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
    );
}

/* -------------------- Helpers -------------------- */
function guessMimeFromUri(uri: string | null | undefined) {
    if (!uri) return null;
    const lower = uri.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".heic")) return "image/heic";
    return null;
}

function getCategoryIcon(category: string): string {
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
}

/* -------------------- Styles -------------------- */
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
    centeredContent: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },

    // Auth Card
    authCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#f3f4f6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    lockIcon: {
        fontSize: 40,
    },
    authTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
    },
    authSubtitle: {
        fontSize: 16,
        color: "#6b7280",
        textAlign: "center",
        lineHeight: 22,
    },

    // Header
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "800",
        color: "#111827",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#6b7280",
    },

    // Step Card
    stepCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        overflow: "hidden",
    },
    stepHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    stepNumber: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#4f46e5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    stepNumberText: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
    },
    stepInfo: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 2,
    },
    stepDescription: {
        fontSize: 14,
        color: "#6b7280",
    },
    stepContent: {
        padding: 20,
    },

    // Action Buttons
    buttonRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        backgroundColor: "#f9fafb",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#e5e7eb",
    },
    actionButtonPrimary: {
        backgroundColor: "#4f46e5",
        borderColor: "#4f46e5",
    },
    actionButtonIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    actionButtonTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    actionButtonTitlePrimary: {
        color: "#fff",
    },
    actionButtonSubtitle: {
        fontSize: 12,
        color: "#6b7280",
    },
    actionButtonSubtitlePrimary: {
        color: "#c7d2fe",
    },

    // Image Preview
    imagePreviewCard: {
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#f3f4f6",
    },
    imagePreview: {
        width: "100%",
        height: 240,
        backgroundColor: "#f9fafb",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 12,
    },
    imageOverlayText: {
        color: "#fff",
        fontSize: 14,
        textAlign: "center",
    },

    // Empty State
    emptyState: {
        backgroundColor: "#f9fafb",
        borderRadius: 16,
        padding: 40,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#e5e7eb",
        borderStyle: "dashed",
    },
    emptyStateIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyStateText: {
        fontSize: 16,
        color: "#9ca3af",
    },

    // Analyze Button
    analyzeButton: {
        flexDirection: "row",
        backgroundColor: "#4f46e5",
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    analyzeButtonDisabled: {
        backgroundColor: "#9ca3af",
    },
    analyzeButtonIcon: {
        fontSize: 24,
    },
    analyzeButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },

    // Error Card
    errorCard: {
        flexDirection: "row",
        backgroundColor: "#fef2f2",
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: "#fee2e2",
    },
    errorIcon: {
        fontSize: 24,
    },
    errorText: {
        flex: 1,
        color: "#991b1b",
        fontSize: 14,
        lineHeight: 20,
    },

    // Assessment Card
    assessmentCard: {
        backgroundColor: "#f0fdf4",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    assessmentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    assessmentTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },

    // Grade Badge
    gradeBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    gradeBadgeText: {
        fontSize: 24,
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
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    metricIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: "#6b7280",
    },

    // Hazard Section
    hazardSection: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },
    sectionCount: {
        fontSize: 14,
        color: "#6b7280",
        backgroundColor: "#f3f4f6",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },

    // Hazard Card
    hazardCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
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
        marginBottom: 4,
    },
    hazardLocation: {
        fontSize: 13,
        color: "#6b7280",
    },
    severityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
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
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 4,
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
    },
    solutionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 12,
    },
    solutionItem: {
        flexDirection: "row",
        marginBottom: 8,
    },
    solutionBullet: {
        fontSize: 14,
        color: "#6b7280",
        marginRight: 8,
        marginTop: 2,
    },
    solutionText: {
        flex: 1,
        fontSize: 14,
        color: "#4b5563",
        lineHeight: 20,
    },

    // Recent Section
    recentSection: {
        marginTop: 20,
        marginBottom: 20,
    },
    recentTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 16,
    },
    recentList: {
        paddingRight: 16,
        gap: 12,
    },
    recentCard: {
        width: 200,
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    recentImage: {
        width: "100%",
        height: 120,
        backgroundColor: "#f3f4f6",
    },
    recentContent: {
        padding: 16,
    },
    recentStats: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        marginBottom: 12,
    },
    recentStat: {
        alignItems: "center",
    },
    recentStatValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 2,
    },
    recentStatLabel: {
        fontSize: 11,
        color: "#6b7280",
    },
    recentDivider: {
        width: 1,
        height: 30,
        backgroundColor: "#e5e7eb",
    },
    recentButton: {
        backgroundColor: "#4f46e5",
        borderRadius: 10,
        padding: 12,
        alignItems: "center",
    },
    recentButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalImage: {
        width: screenWidth * 0.9,
        height: "80%",
    },
});