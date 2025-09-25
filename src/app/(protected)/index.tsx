// src/app/(protected)/index.tsx
import AnalyzePhotoScreen from "@/components/AnalyzePhotoScreen";

export default function Index() {
    return(
        <AnalyzePhotoScreen
            apiBaseUrl="https://hseappapi.vercel.app"
            // tokenTemplate="backend" // optional
        />
    )
}