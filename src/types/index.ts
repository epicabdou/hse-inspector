// src/types/index.ts
export type HazardCategory =
    | "PPE"
    | "Fall"
    | "Fire"
    | "Electrical"
    | "Chemical"
    | "Machinery"
    | "Environmental"
    | "Other";

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type SafetyGrade = "A" | "B" | "C" | "D" | "F";
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface Hazard {
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

export interface OverallAssessment {
    riskScore: number;
    safetyGrade: SafetyGrade;
    topPriorities: string[];
    complianceStandards?: string[];
}

export interface AnalysisMetadata {
    analysisTime: number;
    tokensUsed: number;
    confidence: number;
}

export interface AnalysisResult {
    hazards: Hazard[];
    overallAssessment: OverallAssessment;
    metadata: AnalysisMetadata;
}

export interface Inspection {
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

export interface InspectionResponse {
    ok: boolean;
    inspection: Inspection;
}

export interface ListResponse {
    ok: boolean;
    inspections: Inspection[];
    page: number;
    pageSize: number;
    totalCount: number;
}

export interface AnalyzeResponse {
    ok: boolean;
    inspection: Inspection;
    analysis: AnalysisResult;
    usage?: any;
}

export interface UploadResponse {
    ok: boolean;
    url: string;
    fileId?: string;
}

// API Error types
export interface ApiError {
    message: string;
    code?: string;
    status?: number;
}

// Navigation types
export type RootStackParamList = {
    '(auth)': undefined;
    '(protected)': undefined;
    welcome: undefined;
};

export type AuthStackParamList = {
    'sign-in': undefined;
    'sign-up': undefined;
    verify: undefined;
};

export type ProtectedStackParamList = {
    '(tabs)': undefined;
    'inspection/[id]': { id: string };
};

export type TabParamList = {
    index: undefined;
    inspections: undefined;
    reports: undefined;
    settings: undefined;
};

// Component Props types
export interface ScreenProps {
    children?: React.ReactNode;
}

export interface ModalProps {
    visible: boolean;
    onClose: () => void;
}

export interface FormField {
    name: string;
    label: string;
    type: 'email' | 'password' | 'text' | 'number';
    required?: boolean;
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
}