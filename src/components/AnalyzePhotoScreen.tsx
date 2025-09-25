// src/components/AnalyzePhotoScreen.tsx
import React, { useMemo, useState, useEffect } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSession } from '@clerk/clerk-expo';

/**
 * AnalyzePhotoScreen (User) — Clerk JWT token authentication
 * Flow:
 *  1) Take/Upload photo (base64)
 *  2) POST /api/uploads/base64  -> { url }  (server compresses+stores)
 *  3) POST /api/inspections/analyze { imageUrl } -> analysis JSON
 *  4) Show results + recent
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
    priority: number; // 1-10
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
    apiBaseUrl?: string;              // e.g. "https://hseappapi.vercel.app"
    tokenTemplate?: string;           // Optional token template for Clerk
};

const DEFAULT_BASE = "https://hseappapi.vercel.app";
const PAGE_SIZE = 10;

const AnalyzePhotoScreen: React.FC<AnalyzePhotoScreenProps> = ({
                                                                   apiBaseUrl = DEFAULT_BASE,
                                                                   tokenTemplate,
                                                               }) => {
    const { session } = useSession();

    // image state
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>("image/jpeg");

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

    // Optional client-side compression to keep the base64 payload small
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

    // Upload → Analyze (URL-based) with Clerk JWT authentication
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
            // 1) Upload to server (server compresses → WebP → Blob)
            setUploading(true);
            const uploadHeaders = await buildAuthHeaders();
            const uploadResp = await fetch(`${apiBaseUrl}/api/uploads/base64`, {
                method: "POST",
                headers: uploadHeaders,
                body: JSON.stringify({
                    base64: imageBase64, // raw base64 (no data: prefix)
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

    // Recent inspections with Clerk JWT authentication
    const fetchRecent = async () => {
        if (!session) {
            return; // No session, skip fetching recent inspections
        }

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
            // Silently ignore errors for recent inspections (usually auth or network issues)
            console.warn("Failed to fetch recent inspections:", e);
        } finally {
            setListLoading(false);
        }
    };

    // Fetch recent inspections when session becomes available
    useEffect(() => {
        if (session) {
            fetchRecent();
        }
    }, [session]);

    // Group hazards for SectionList
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
                <Text style={styles.h1}>Authentication Required</Text>
                <Text style={styles.dimText}>Please sign in to use the photo analysis feature.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {/* Step 2 — Take/Upload Photo */}
            <Text style={styles.h1}>Step 2 — Take / Upload Photo</Text>
            <View style={styles.row}>
                <PrimaryButton title="Take Photo" onPress={handleTakePhoto} />
                <SecondaryButton title="Upload from Gallery" onPress={handlePickFromGallery} />
            </View>

            {imageUri ? (
                <View style={styles.previewCard}>
                    <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
                    <Text style={styles.metaText}>{mimeType}</Text>
                </View>
            ) : (
                <Text style={styles.dimText}>No image selected yet.</Text>
            )}

            {/* Step 3 — Upload + AI Analysis */}
            <Text style={styles.h1}>Step 3 — AI Analysis</Text>
            <PrimaryButton
                title={uploading ? "Uploading…" : analyzing ? "Analyzing…" : "Analyze Photo"}
                onPress={analyze}
                disabled={!hasImage || uploading || analyzing}
            />
            {(uploading || analyzing) && (
                <View style={styles.loadingRow}>
                    <ActivityIndicator />
                    <Text style={styles.dimText}>
                        {uploading ? "Uploading photo…" : "Running safety analysis…"}
                    </Text>
                </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Step 4 — View Results */}
            <Text style={styles.h1}>Step 4 — View Results</Text>
            {result ? (
                <>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Overall Assessment</Text>
                        <View style={styles.summaryGrid}>
                            <SummaryItem label="Risk Score" value={String(result.overallAssessment.riskScore)} />
                            <SummaryItem label="Safety Grade" value={result.overallAssessment.safetyGrade} />
                            <SummaryItem label="Confidence" value={`${result.metadata.confidence}%`} />
                        </View>
                    </View>

                    {/* Hazard Cards */}
                    {sections.map((section) => (
                        <View key={section.title}>
                            <Text style={styles.sectionHeader}>{section.title}</Text>
                            {section.data.map((hazard) => (
                                <HazardCard key={hazard.id} hazard={hazard} />
                            ))}
                        </View>
                    ))}
                </>
            ) : (
                <Text style={styles.dimText}>Run an analysis to view results.</Text>
            )}

            {/* Recent analyses */}
            <Text style={styles.h1}>Recent Analyses</Text>
            {listLoading ? (
                <ActivityIndicator />
            ) : (
                <FlatList
                    data={recent}
                    keyExtractor={(it) => it.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                    renderItem={({ item }) => (
                        <View style={styles.recentCard}>
                            <Image source={{ uri: item.imageUrl }} style={styles.recentThumb} resizeMode="cover" />
                            <Text style={styles.recentMeta}>
                                Risk: {item.riskScore ?? "-"} | Hazards: {item.hazardCount ?? "-"}
                            </Text>
                            <Text style={styles.recentMeta}>Grade: {item.safetyGrade ?? "-"}</Text>
                        </View>
                    )}
                />
            )}
        </ScrollView>
    );
};

export default AnalyzePhotoScreen;

/* -------------------- UI Components -------------------- */
function HazardCard({ hazard }: { hazard: Hazard }) {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{hazard.description}</Text>
                <SeverityPill severity={hazard.severity} />
            </View>

            <Text style={styles.cardMeta}>Location: {hazard.location}</Text>
            <Text style={styles.cardMeta}>Priority: {hazard.priority}/10</Text>
            {!!hazard.estimatedCost && <Text style={styles.cardMeta}>Estimated Cost: {hazard.estimatedCost}</Text>}
            {!!hazard.timeToImplement && <Text style={styles.cardMeta}>Time to Implement: {hazard.timeToImplement}</Text>}

            <View style={styles.cardDivider} />
            <Text style={styles.subheading}>Immediate Fixes</Text>
            {hazard.immediateSolutions.map((s, i) => (
                <Bullet key={`i-${i}`} text={s} />
            ))}
            <Text style={[styles.subheading, { marginTop: 8 }]}>Long-term Fixes</Text>
            {hazard.longTermSolutions.map((s, i) => (
                <Bullet key={`l-${i}`} text={s} />
            ))}
        </View>
    );
}

function SeverityPill({ severity }: { severity: Severity }) {
    const color =
        severity === "Critical" ? "#b91c1c"
            : severity === "High" ? "#dc2626"
                : severity === "Medium" ? "#f59e0b"
                    : "#16a34a";
    const bg = `${color}20`;
    return (
        <View style={[styles.pill, { backgroundColor: bg, borderColor: color }]}>
            <Text style={[styles.pillText, { color }]}>{severity}</Text>
        </View>
    );
}

function Bullet({ text }: { text: string }) {
    return (
        <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{text}</Text>
        </View>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue}>{value}</Text>
        </View>
    );
}

function PrimaryButton({
                           title,
                           onPress,
                           disabled,
                       }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={!!disabled}
            style={[styles.button, { backgroundColor: disabled ? "#d1d5db" : "#111827" }]}
        >
            <Text style={[styles.buttonText, { color: "#fff" }]}>{title}</Text>
        </TouchableOpacity>
    );
}

function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.button, styles.buttonOutline]}>
            <Text style={[styles.buttonText, { color: "#111827" }]}>{title}</Text>
        </TouchableOpacity>
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

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fafafa",
    },
    scrollContent: {
        paddingTop: Platform.select({ ios: 52, android: 24, default: 24 }),
        paddingHorizontal: 16,
        paddingBottom: 48,
    },
    centeredContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    h1: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
    row: { flexDirection: "row", gap: 12 },
    previewCard: {
        borderRadius: 16,
        backgroundColor: "#fff",
        padding: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginTop: 12,
    },
    preview: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#f3f4f6" },
    metaText: { marginTop: 8, color: "#6b7280", fontSize: 12 },
    dimText: { color: "#6b7280", marginTop: 8 },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
    errorText: { color: "#b91c1c", marginTop: 8 },
    sectionHeader: { fontWeight: "700", fontSize: 16, marginTop: 16, marginBottom: 8 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        padding: 12,
        marginBottom: 10,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 8 },
    cardTitle: { flex: 1, fontWeight: "600", fontSize: 15 },
    cardMeta: { color: "#6b7280", fontSize: 12, marginTop: 2 },
    cardDivider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 8 },
    subheading: { fontWeight: "600" },
    bulletRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    bulletDot: { fontSize: 18, lineHeight: 18 },
    bulletText: { flex: 1, color: "#111827" },
    summaryCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        padding: 12,
        marginTop: 12,
        marginBottom: 8,
    },
    summaryTitle: { fontWeight: "700", marginBottom: 6 },
    summaryGrid: { flexDirection: "row", gap: 16 },
    summaryLabel: { color: "#6b7280", fontSize: 12 },
    summaryValue: { fontWeight: "700", fontSize: 16 },
    pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    pillText: { fontSize: 12, fontWeight: "700" },
    button: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
    buttonOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db" },
    buttonText: { fontWeight: "700" },
    recentCard: {
        width: 180,
        borderRadius: 14,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        padding: 8,
    },
    recentThumb: { width: "100%", height: 100, borderRadius: 8, backgroundColor: "#f3f4f6" },
    recentMeta: { fontSize: 12, color: "#6b7280", marginTop: 4 },
});