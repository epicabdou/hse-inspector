import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ActivityIndicator, View } from "react-native";
import React from "react";
import CustomButton from "@/components/CustomButton"; // adjust if your alias differs

function LogoutButton() {
    const { signOut, isSignedIn } = useAuth();

    return (
        <CustomButton
            text="Log out"
            disabled={!isSignedIn}
            onPress={async () => {
                try {
                    await signOut();
                    // isSignedIn will flip to false; below layout will Redirect to /sign-in
                } catch (e) {
                    console.warn("Failed to sign out:", e);
                }
            }}
        />
    );
}

export default function ProtectedLayout() {
    const { isSignedIn, isLoaded } = useAuth();

    if (!isLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!isSignedIn) {
        return <Redirect href="/sign-in" />;
    }

    // Use a Stack so we can render a header-right logout button across all nested screens
    return (
        <Stack
            screenOptions={{
                headerTitle: "HSE Inspector",
                headerRight: () => <LogoutButton />,
            }}
        />
    );
}
