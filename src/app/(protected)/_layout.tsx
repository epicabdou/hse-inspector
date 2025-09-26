import { Redirect, Stack, Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
    ActivityIndicator,
    View,
    StyleSheet,
    Text,
    StatusBar,
    Platform,
    SafeAreaView
} from "react-native";
import React from "react";
import CustomButton from "@/components/CustomButton";

// You'll need to install expo-vector-icons or use your preferred icon library
// import { Ionicons, MaterialIcons } from '@expo/vector-icons';

function LogoutButton() {
    const { signOut, isSignedIn } = useAuth();

    return (
        <View style={styles.logoutContainer}>
            <CustomButton
                text="Logout"
                variant="ghost"
                size="small"
                disabled={!isSignedIn}
                onPress={async () => {
                    try {
                        await signOut();
                    } catch (e) {
                        console.warn("Failed to sign out:", e);
                    }
                }}
            />
        </View>
    );
}

function LoadingScreen() {
    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#4353FD" />
            <View style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>HSE</Text>
                    </View>
                    <ActivityIndicator
                        size="large"
                        color="#4353FD"
                        style={styles.loadingIndicator}
                    />
                    <Text style={styles.loadingText}>Initializing...</Text>
                    <View style={styles.loadingBar}>
                        <View style={styles.loadingProgress} />
                    </View>
                </View>
            </View>
        </>
    );
}

export default function RootLayout() {
    const { isSignedIn, isLoaded } = useAuth();

    if (!isLoaded) {
        return <LoadingScreen />;
    }

    if (!isSignedIn) {
        return <Redirect href="/sign-in" />;
    }

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <SafeAreaView style={styles.safeArea}>
                {/* You can choose between Stack or Tabs layout */}
                <StackLayout />
                {/* <TabsLayout /> */}
            </SafeAreaView>
        </>
    );
}

function StackLayout() {
    return (
        <Stack
            screenOptions={{
                headerTitle: "HSE Inspector",
                headerTitleStyle: styles.headerTitle,
                headerStyle: styles.headerStyle,
                headerTintColor: "#2C3E50",
                headerRight: () => <LogoutButton />,
                headerShadowVisible: true,
                // headerBackTitleVisible: false,
                headerTitleAlign: "center",
                presentation: "card",
                animation: "slide_from_right",
            }}
        >
            <Stack.Screen
                name="(tabs)"
                options={{
                    headerShown: false // Hide header for tab layout
                }}
            />
            <Stack.Screen
                name="profile"
                options={{
                    title: "Profile Settings",
                    headerStyle: styles.modalHeaderStyle,
                    presentation: "modal",
                }}
            />
            <Stack.Screen
                name="inspection/[id]"
                options={{
                    title: "Inspection Details",
                    headerBackTitle: "Back",
                }}
            />
        </Stack>
    );
}

function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: "#4353FD",
                tabBarInactiveTintColor: "#64748B",
                tabBarLabelStyle: styles.tabBarLabel,
                headerStyle: styles.headerStyle,
                headerTitleStyle: styles.headerTitle,
                headerRight: () => <LogoutButton />,
                headerShadowVisible: true,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Dashboard",
                    headerTitle: "HSE Dashboard",
                    // tabBarIcon: ({ color, size }) => (
                    //   <Ionicons name="home-outline" size={size} color={color} />
                    // ),
                }}
            />
            <Tabs.Screen
                name="inspections"
                options={{
                    title: "Inspections",
                    headerTitle: "Safety Inspections",
                    // tabBarIcon: ({ color, size }) => (
                    //   <MaterialIcons name="assignment" size={size} color={color} />
                    // ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    headerTitle: "Inspection Reports",
                    // tabBarIcon: ({ color, size }) => (
                    //   <Ionicons name="document-text-outline" size={size} color={color} />
                    // ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    headerTitle: "App Settings",
                    // tabBarIcon: ({ color, size }) => (
                    //   <Ionicons name="settings-outline" size={size} color={color} />
                    // ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    // Loading Screen Styles
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 24,
    },
    loadingContent: {
        alignItems: "center",
        maxWidth: 280,
        width: "100%",
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: "#4353FD",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        shadowColor: "#4353FD",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    logoText: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: 1,
    },
    loadingIndicator: {
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 16,
        color: "#64748B",
        fontWeight: "500",
        marginBottom: 24,
        textAlign: "center",
    },
    loadingBar: {
        width: "100%",
        height: 4,
        backgroundColor: "#E2E8F0",
        borderRadius: 2,
        overflow: "hidden",
    },
    loadingProgress: {
        width: "60%",
        height: "100%",
        backgroundColor: "#4353FD",
        borderRadius: 2,
    },

    // Header Styles
    headerStyle: {
        backgroundColor: "#FFFFFF",
        elevation: Platform.OS === "android" ? 4 : 0,
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderBottomWidth: Platform.OS === "ios" ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: "#E2E8F0",
        height: Platform.OS === "android" ? 64 : 96,
    },
    modalHeaderStyle: {
        backgroundColor: "#FFFFFF",
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E2E8F0",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
        letterSpacing: 0.5,
    },

    // Logout Button Styles
    logoutContainer: {
        marginRight: 16,
        paddingVertical: 4,
    },

    // Tab Bar Styles
    tabBar: {
        backgroundColor: "#FFFFFF",
        borderTopColor: "#E2E8F0",
        borderTopWidth: StyleSheet.hairlineWidth,
        height: Platform.OS === "ios" ? 88 : 64,
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
        paddingTop: 8,
        elevation: Platform.OS === "android" ? 8 : 0,
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabBarLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 4,
    },

    // Screen Container Styles (you can export these for use in individual screens)
    screenContainer: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    pageHeader: {
        marginBottom: 24,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#1E293B",
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 16,
        color: "#64748B",
        lineHeight: 24,
    },

    // Card Styles (reusable for content)
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#E2E8F0",
    },

    // Section Styles
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 12,
    },
    sectionDescription: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 16,
        lineHeight: 20,
    },

    // Status Badge Styles
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: "flex-start",
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    // Priority/Status Colors
    statusSuccess: {
        backgroundColor: "#DCFCE7",
    },
    statusSuccessText: {
        color: "#166534",
    },
    statusWarning: {
        backgroundColor: "#FEF3C7",
    },
    statusWarningText: {
        color: "#D97706",
    },
    statusDanger: {
        backgroundColor: "#FEE2E2",
    },
    statusDangerText: {
        color: "#DC2626",
    },
    statusInfo: {
        backgroundColor: "#DBEAFE",
    },
    statusInfoText: {
        color: "#2563EB",
    },
});

// Export common styles for use in other components
export const commonStyles = {
    screenContainer: styles.screenContainer,
    contentContainer: styles.contentContainer,
    pageHeader: styles.pageHeader,
    pageTitle: styles.pageTitle,
    pageSubtitle: styles.pageSubtitle,
    card: styles.card,
    section: styles.section,
    sectionTitle: styles.sectionTitle,
    sectionDescription: styles.sectionDescription,
    statusBadge: styles.statusBadge,
    statusText: styles.statusText,
    statusSuccess: styles.statusSuccess,
    statusSuccessText: styles.statusSuccessText,
    statusWarning: styles.statusWarning,
    statusWarningText: styles.statusWarningText,
    statusDanger: styles.statusDanger,
    statusDangerText: styles.statusDangerText,
    statusInfo: styles.statusInfo,
    statusInfoText: styles.statusInfoText,
};