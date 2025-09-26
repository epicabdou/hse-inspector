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
    ViewStyle,
    TextStyle,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSession } from '@clerk/clerk-expo';
import { router } from "expo-router";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// Types (same as before)
type HazardCategory =
    | "PPE" | "Fall" | "Fire" | "Electrical" | "Chemical" | "Machinery" | "Environmental" | "Other";

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
    const { colors, isDark } = useTheme();

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // State
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>("image/jpeg");
    const [showImageModal, setShowImageModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [listLoading, setListLoading] = useState(false);
    const [recent, setRecent] = useState<ListResponse["inspections"]>([]);

    const hasImage = !!imageUri && !!imageBase64;

    // Styles
    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.background,
    };

    const scrollContentStyle: ViewStyle = {
        paddingTop: Platform.select({ ios: 60, android: 40, default: 40 }),
        paddingHorizontal: 16,
        paddingBottom: 80,
    };

    const centeredContentStyle: ViewStyle = {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    };

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

    // Authentication functions (same as before)
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

    const buildAuthHeaders = async (init?: Record<string, string>) => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(init || {})
        };

        const token = await getAuthToken();
        if (!token) {
            throw new Error("Authentication required. Please ensure you're logged in with Clerk.");
        }

        headers["Authorization"] = `Bearer ${token}`;
        return headers;
    };

    // Image processing functions (same as before)
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

    if (!session) {
        return (
            <View style={[containerStyle, centeredContentStyle]}>
                <AuthCard />
            </View>
        );
    }

    return (
        <>
            <ScrollView
                style={containerStyle}
                contentContainerStyle={scrollContentStyle}
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
                    <Header />

                    <StepCard
                        number="1"
                        title="Capture Image"
                        description="Take a photo or select from gallery"
                    >
                        <ActionButtons
                            onTakePhoto={handleTakePhoto}
                            onPickFromGallery={handlePickFromGallery}
                        />

                        {imageUri ? (
                            <ImagePreview
                                imageUri={imageUri}
                                onPress={() => setShowImageModal(true)}
                            />
                        ) : (
                            <EmptyImageState />
                        )}
                    </StepCard>

                    <StepCard
                        number="2"
                        title="AI Analysis"
                        description="Process image for safety hazards"
                    >
                        <AnalyzeButton
                            onPress={analyze}
                            disabled={!hasImage || uploading || analyzing}
                            uploading={uploading}
                            analyzing={analyzing}
                        />

                        {error && <ErrorCard error={error} />}
                    </StepCard>

                    {result && (
                        <StepCard
                            number="3"
                            title="Analysis Results"
                            description="Safety assessment complete"
                        >
                            <AssessmentCard result={result} />

                            {sections.map((section) => (
                                <HazardSection key={section.title} section={section} />
                            ))}
                        </StepCard>
                    )}

                    {recent.length > 0 && <RecentSection recent={recent} />}
                </Animated.View>
            </ScrollView>

            <ImageModal
                visible={showImageModal}
                imageUri={imageUri}
                onClose={() => setShowImageModal(false)}
            />
        </>
    );
};

export default AnalyzePhotoScreen;

// Component definitions
function AuthCard() {
    const { colors } = useTheme();

    const cardStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 32,
        alignItems: "center",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    };

    const iconContainerStyle: ViewStyle = {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.backgroundTertiary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    };

    const titleStyle: TextStyle = {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 8,
    };

    const subtitleStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 22,
    };

    return (
        <View style={cardStyle}>
            <View style={iconContainerStyle}>
                <Ionicons name="lock-closed" size={40} color={colors.primary} />
            </View>
            <Text style={titleStyle}>Authentication Required</Text>
            <Text style={subtitleStyle}>
                Please sign in to access the AI-powered safety analysis features
            </Text>
        </View>
    );
}

function Header() {
    const { colors } = useTheme();

    const headerStyle: ViewStyle = {
        marginBottom: 24,
    };

    const titleStyle: TextStyle = {
        fontSize: 32,
        fontWeight: "800",
        color: colors.text,
        marginBottom: 4,
    };

    const subtitleStyle: TextStyle = {
        fontSize: 16,
        color: colors.textSecondary,
    };

    return (
        <View style={headerStyle}>
            <Text style={titleStyle}>Safety Analysis</Text>
            <Text style={subtitleStyle}>AI-powered hazard detection</Text>
        </View>
    );
}

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
    const { colors } = useTheme();

    const cardStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        overflow: "hidden",
    };

    const headerStyle: ViewStyle = {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    };

    const numberStyle: ViewStyle = {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    };

    const numberTextStyle: TextStyle = {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
    };

    const infoStyle: ViewStyle = {
        flex: 1,
    };

    const titleStyle: TextStyle = {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 2,
    };

    const descriptionStyle: TextStyle = {
        fontSize: 14,
        color: colors.textSecondary,
    };

    const contentStyle: ViewStyle = {
        padding: 20,
    };

    return (
        <View style={cardStyle}>
            <View style={headerStyle}>
                <View style={numberStyle}>
                    <Text style={numberTextStyle}>{number}</Text>
                </View>
                <View style={infoStyle}>
                    <Text style={titleStyle}>{title}</Text>
                    <Text style={descriptionStyle}>{description}</Text>
                </View>
            </View>
            <View style={contentStyle}>{children}</View>
        </View>
    );
}

function ActionButtons({
                           onTakePhoto,
                           onPickFromGallery
                       }: {
    onTakePhoto: () => void;
    onPickFromGallery: () => void;
}) {
    const { colors } = useTheme();

    const rowStyle: ViewStyle = {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    };

    const buttonStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.border,
    };

    const primaryButtonStyle: ViewStyle = {
        ...buttonStyle,
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    };

    const iconStyle: TextStyle = {
        fontSize: 32,
        marginBottom: 8,
    };

    const titleStyle: TextStyle = {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    };

    const primaryTitleStyle: TextStyle = {
        ...titleStyle,
        color: "#fff",
    };

    const subtitleStyle: TextStyle = {
        fontSize: 12,
        color: colors.textSecondary,
    };

    const primarySubtitleStyle: TextStyle = {
        ...subtitleStyle,
        color: "#c7d2fe",
    };

    return (
        <View style={rowStyle}>
            <TouchableOpacity style={primaryButtonStyle} onPress={onTakePhoto}>
                <Text style={iconStyle}>📷</Text>
                <Text style={primaryTitleStyle}>Camera</Text>
                <Text style={primarySubtitleStyle}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={buttonStyle} onPress={onPickFromGallery}>
                <Text style={iconStyle}>🖼️</Text>
                <Text style={titleStyle}>Gallery</Text>
                <Text style={subtitleStyle}>Choose photo</Text>
            </TouchableOpacity>
        </View>
    );
}

function ImagePreview({
                          imageUri,
                          onPress
                      }: {
    imageUri: string;
    onPress: () => void;
}) {
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.backgroundTertiary,
    };

    const imageStyle: ViewStyle = {
        width: "100%",
        height: 240,
        backgroundColor: colors.backgroundTertiary,
    };

    const overlayStyle: ViewStyle = {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 12,
    };

    const overlayTextStyle: TextStyle = {
        color: "#fff",
        fontSize: 14,
        textAlign: "center",
    };

    return (
        <Pressable style={containerStyle} onPress={onPress}>
            <Image source={{ uri: imageUri }} style={imageStyle} resizeMode="cover" />
            <View style={overlayStyle}>
                <Text style={overlayTextStyle}>Tap to enlarge</Text>
            </View>
        </Pressable>
    );
}

function EmptyImageState() {
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 16,
        padding: 40,
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: "dashed",
    };

    const iconStyle: TextStyle = {
        fontSize: 48,
        marginBottom: 12,
    };

    const textStyle: TextStyle = {
        fontSize: 16,
        color: colors.textTertiary,
    };

    return (
        <View style={containerStyle}>
            <Text style={iconStyle}>📸</Text>
            <Text style={textStyle}>No image selected</Text>
        </View>
    );
}

function AnalyzeButton({
                           onPress,
                           disabled,
                           uploading,
                           analyzing
                       }: {
    onPress: () => void;
    disabled: boolean;
    uploading: boolean;
    analyzing: boolean;
}) {
    const { colors } = useTheme();

    const buttonStyle: ViewStyle = {
        flexDirection: "row",
        backgroundColor: disabled ? colors.textTertiary : colors.primary,
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    };

    const iconStyle: TextStyle = {
        fontSize: 24,
    };

    const textStyle: TextStyle = {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    };

    const getButtonText = () => {
        if (uploading) return "Uploading...";
        if (analyzing) return "Analyzing...";
        return "Start Analysis";
    };

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={disabled ? 1 : 0.8}
        >
            {(uploading || analyzing) ? (
                <ActivityIndicator color="#fff" size="small" />
            ) : (
                <Text style={iconStyle}>🔍</Text>
            )}
            <Text style={textStyle}>{getButtonText()}</Text>
        </TouchableOpacity>
    );
}

function ErrorCard({ error }: { error: string }) {
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        flexDirection: "row",
        backgroundColor: colors.errorBackground,
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: colors.error,
    };

    const iconStyle: TextStyle = {
        fontSize: 24,
    };

    const textStyle: TextStyle = {
        flex: 1,
        color: colors.error,
        fontSize: 14,
        lineHeight: 20,
    };

    return (
        <View style={containerStyle}>
            <Text style={iconStyle}>⚠️</Text>
            <Text style={textStyle}>{error}</Text>
        </View>
    );
}

function AssessmentCard({ result }: { result: AnalysisResult }) {
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        backgroundColor: colors.successBackground,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.success,
    };

    const headerStyle: ViewStyle = {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    };

    const titleStyle: TextStyle = {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    };

    const gridStyle: ViewStyle = {
        flexDirection: "row",
        gap: 12,
    };

    return (
        <View style={containerStyle}>
            <View style={headerStyle}>
                <Text style={titleStyle}>Overall Assessment</Text>
                <GradeBadge grade={result.overallAssessment.safetyGrade} />
            </View>

            <View style={gridStyle}>
                <MetricCard
                    icon="⚡"
                    label="Risk Score"
                    value={String(result.overallAssessment.riskScore)}
                    color={colors.error}
                />
                <MetricCard
                    icon="🛡️"
                    label="Confidence"
                    value={`${result.metadata.confidence}%`}
                    color={colors.success}
                />
                <MetricCard
                    icon="⚠️"
                    label="Hazards"
                    value={String(result.hazards.length)}
                    color={colors.warning}
                />
            </View>
        </View>
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
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    };

    const iconStyle: TextStyle = {
        fontSize: 24,
        marginBottom: 8,
    };

    const valueStyle: TextStyle = {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    };

    const labelStyle: TextStyle = {
        fontSize: 12,
        color: colors.textSecondary,
    };

    return (
        <View style={containerStyle}>
            <Text style={[iconStyle, { color }]}>{icon}</Text>
            <Text style={valueStyle}>{value}</Text>
            <Text style={labelStyle}>{label}</Text>
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

    const containerStyle: ViewStyle = {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors[grade],
        justifyContent: "center",
        alignItems: "center",
    };

    const textStyle: TextStyle = {
        fontSize: 24,
        fontWeight: "800",
        color: "#fff",
    };

    return (
        <View style={containerStyle}>
            <Text style={textStyle}>{grade}</Text>
        </View>
    );
}

function HazardSection({ section }: { section: { title: string; data: Hazard[] } }) {
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        marginBottom: 20,
    };

    const headerStyle: ViewStyle = {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    };

    const titleStyle: TextStyle = {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    };

    const countStyle: TextStyle = {
        fontSize: 14,
        color: colors.textSecondary,
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    };

    return (
        <View style={containerStyle}>
            <View style={headerStyle}>
                <Text style={titleStyle}>
                    {getCategoryIcon(section.title)} {section.title}
                </Text>
                <Text style={countStyle}>
                    {section.data.length} issue{section.data.length !== 1 ? 's' : ''}
                </Text>
            </View>
            {section.data.map((hazard) => (
                <EnhancedHazardCard key={hazard.id} hazard={hazard} />
            ))}
        </View>
    );
}

function EnhancedHazardCard({ hazard }: { hazard: Hazard }) {
    const { colors } = useTheme();

    const severityColors = {
        Critical: "#991b1b",
        High: "#dc2626",
        Medium: "#f59e0b",
        Low: "#16a34a",
    };

    const cardStyle: ViewStyle = {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    };

    const headerStyle: ViewStyle = {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    };

    const titleSectionStyle: ViewStyle = {
        flex: 1,
        marginRight: 12,
    };

    const titleStyle: TextStyle = {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    };

    const locationStyle: TextStyle = {
        fontSize: 13,
        color: colors.textSecondary,
    };

    const severityBadgeStyle: ViewStyle = {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: `${severityColors[hazard.severity]}15`,
        alignSelf: "flex-start",
    };

    const severityTextStyle: TextStyle = {
        fontSize: 13,
        fontWeight: "700",
        color: severityColors[hazard.severity],
    };

    return (
        <View style={cardStyle}>
            <View style={headerStyle}>
                <View style={titleSectionStyle}>
                    <Text style={titleStyle}>{hazard.description}</Text>
                    <Text style={locationStyle}>📍 {hazard.location}</Text>
                </View>
                <View style={severityBadgeStyle}>
                    <Text style={severityTextStyle}>{hazard.severity}</Text>
                </View>
            </View>
            {/* Add more hazard details here */}
        </View>
    );
}

function RecentSection({ recent }: { recent: ListResponse["inspections"] }) {
    const { colors } = useTheme();

    const containerStyle: ViewStyle = {
        marginTop: 20,
        marginBottom: 20,
    };

    const titleStyle: TextStyle = {
        fontSize: 22,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 16,
    };

    return (
        <View style={containerStyle}>
            <Text style={titleStyle}>Recent Analyses</Text>
            <FlatList
                data={recent}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16, gap: 12 }}
                renderItem={({ item }) => (
                    <RecentCard item={item} onPress={() => router.push(`/inspection/${item.id}`)} />
                )}
            />
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
    const { colors } = useTheme();

    const cardStyle: ViewStyle = {
        width: 200,
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    };

    const imageStyle: ViewStyle = {
        width: "100%",
        height: 120,
        backgroundColor: colors.backgroundTertiary,
    };

    const contentStyle: ViewStyle = {
        padding: 16,
    };

    const statsStyle: ViewStyle = {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        marginBottom: 12,
    };

    const statStyle: ViewStyle = {
        alignItems: "center",
    };

    const statValueStyle: TextStyle = {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 2,
    };

    const statLabelStyle: TextStyle = {
        fontSize: 11,
        color: colors.textSecondary,
    };

    const dividerStyle: ViewStyle = {
        width: 1,
        height: 30,
        backgroundColor: colors.border,
    };

    const buttonStyle: ViewStyle = {
        backgroundColor: colors.primary,
        borderRadius: 10,
        padding: 12,
        alignItems: "center",
    };

    const buttonTextStyle: TextStyle = {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    };

    return (
        <Pressable style={cardStyle} onPress={onPress}>
            <Image source={{ uri: item.imageUrl }} style={imageStyle} resizeMode="cover" />
            <View style={contentStyle}>
                <View style={statsStyle}>
                    <View style={statStyle}>
                        <Text style={statValueStyle}>{item.riskScore ?? "-"}</Text>
                        <Text style={statLabelStyle}>Risk</Text>
                    </View>
                    <View style={dividerStyle} />
                    <View style={statStyle}>
                        <Text style={statValueStyle}>{item.hazardCount ?? "-"}</Text>
                        <Text style={statLabelStyle}>Hazards</Text>
                    </View>
                    <View style={dividerStyle} />
                    <View style={statStyle}>
                        <Text style={statValueStyle}>{item.safetyGrade ?? "-"}</Text>
                        <Text style={statLabelStyle}>Grade</Text>
                    </View>
                </View>
                <TouchableOpacity style={buttonStyle} onPress={onPress}>
                    <Text style={buttonTextStyle}>View Details →</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
    );
}

function ImageModal({
                        visible,
                        imageUri,
                        onClose
                    }: {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
}) {
    const overlayStyle: ViewStyle = {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center",
    };

    const imageStyle: ViewStyle = {
        width: screenWidth * 0.9,
        height: "80%",
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={overlayStyle}>
                    {imageUri && (
                        <Image source={{ uri: imageUri }} style={imageStyle} resizeMode="contain" />
                    )}
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// Helper functions
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