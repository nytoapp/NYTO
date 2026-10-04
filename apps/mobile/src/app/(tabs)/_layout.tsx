import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Stack, Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { useEffect } from "react";
import { loadAccount } from "../../features/auth/account";
import { useSession } from "../../features/auth/useSession";
import { city, font } from "../../features/city/theme";
import { revealApp } from "../../features/landing/reveal";
import { useOnboarding } from "../../features/onboarding/store";

const icons = {
  index: { off: "home-outline", on: "home" },
  explore: { off: "compass-outline", on: "compass" },
  trips: { off: "calendar-outline", on: "calendar" },
  saved: { off: "bookmark-outline", on: "bookmark" },
  profile: { off: "person-outline", on: "person" },
} as const;

export default function TabLayout() {
  const stage = useOnboarding((state) => state.stage);
  const { signedIn } = useSession();
  const account = useQuery({ queryKey: ["account"], enabled: signedIn && stage === "app", queryFn: loadAccount });
  useEffect(() => {
    if (stage === "app") revealApp();
  }, [stage]);
  if (stage === "welcome") {
    return <Redirect href="/welcome" />;
  }
  if (stage === "interests") {
    return <Redirect href="/interests" />;
  }
  if (signedIn && account.isSuccess && !account.data.displayName) {
    return <Redirect href="/name" />;
  }
  return (
    <>
    <Stack.Screen options={{ statusBarStyle: "dark", contentStyle: { backgroundColor: city.page } }} />
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: city.ink,
        tabBarInactiveTintColor: city.quiet,
        tabBarStyle: {
          backgroundColor: city.page,
          borderTopColor: city.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarLabelStyle: font.navigation,
        tabBarItemStyle: { paddingTop: 4 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? icons.index.on : icons.index.off} color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? icons.explore.on : icons.explore.off} color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Plans",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? icons.trips.on : icons.trips.off} color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? icons.saved.on : icons.saved.off} color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? icons.profile.on : icons.profile.off} color={color} size={22} />,
        }}
      />
    </Tabs>
    </>
  );
}

