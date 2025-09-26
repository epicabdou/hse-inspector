// src/app/(protected)/(tabs)/index.tsx
import AnalyzePhotoScreen from "@/components/AnalyzePhotoScreen";

export default function TabIndex() {
    return (
        <AnalyzePhotoScreen
            apiBaseUrl="https://hseappapi.vercel.app"
            // tokenTemplate="backend" // optional
        />
    );
}