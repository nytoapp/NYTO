import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View, type ColorValue } from "react-native";
import { useEffect } from "react";
import { useTheme } from "../../components/theme/ThemeProvider";
import { revealApp } from "../../features/landing/reveal";
import { useOnboarding } from "../../features/onboarding/store";

function TabIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: ColorValue; focused: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tabIcon}>
      <View style={[styles.mark, { backgroundColor: focused ? colors.accent : "transparent" }]} />
      <Ionicons name={name} color={color} size={20} />
    </View>
  );
}

const icons = {
  index: "home-outline",
  search: "search-outline",
  saved: "bookmark-outline",
  trips: "calendar-outline",
  profile: "person-outline",
} as const;

export default function TabLayout() {
  const colors = useTheme();
  const stage = useOnboarding((state) => state.stage);
  useEffect(() => {
    if (stage === "app") revealApp();
  }, [stage]);
  if (stage === "welcome") {
    return <Redirect href="/welcome" />;
  }
  if (stage === "interests") {
    return <Redirect href="/interests" />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.tertiaryText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500", letterSpacing: 0.2 },
        tabBarItemStyle: { paddingTop: 4 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <TabIcon name={icons.index} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => <TabIcon name={icons.search} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => <TabIcon name={icons.saved} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Plans",
          tabBarIcon: ({ color, focused }) => <TabIcon name={icons.trips} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => <TabIcon name={icons.profile} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: "center", gap: 4 },
  mark: { width: 12, height: 2, borderRadius: 1 },
});
