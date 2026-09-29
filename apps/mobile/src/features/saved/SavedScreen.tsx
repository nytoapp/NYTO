import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { SubjectDetail } from "@atlas/contracts";
import { CollectionCard, kindLabel, Rail, SectionHeader } from "../../components/discovery";
import { AppText, Button, Card, EmptyState, ErrorState, Screen, SearchField, Skeleton } from "../../components/ui";
import { space } from "../../components/theme/tokens";
import { apiRequest } from "../../api/client";
import { SignInSheet } from "../auth/SignInSheet";
import { useSession } from "../auth/useSession";

type SaveList = { items: { id: string; subjectId: string }[] };
type CollectionList = { items: { id: string; title: string }[] };

export function SavedScreen() {
  const router = useRouter();
  const { signedIn, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const saves = useQuery({
    queryKey: ["saves"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<SaveList>("/api/v1/saves");
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Saves are unavailable.");
      return response.data;
    },
  });
  const collections = useQuery({
    queryKey: ["collections"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<CollectionList>("/api/v1/collections");
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Collections are unavailable.");
      return response.data;
    },
  });
  const subjects = useQueries({
    queries: (saves.data?.items ?? []).slice(0, 12).map((item) => ({
      queryKey: ["subject", item.subjectId],
      queryFn: async () => {
        const response = await apiRequest<SubjectDetail>(`/api/v1/subjects/${item.subjectId}`);
        if (response.error || !response.data) throw new Error(response.error?.message ?? "Unavailable");
        return response.data;
      },
    })),
  });

  async function createCollection() {
    const next = title.trim();
    if (!next) return;
    const response = await apiRequest("/api/v1/collections", { method: "POST", body: JSON.stringify({ title: next }) });
    if (!response.error) {
      setTitle("");
      await collections.refetch();
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <AppText role="brand" tone="tertiary">
            LIBRARY
          </AppText>
          <AppText role="title">Places worth coming back to</AppText>
        </View>
        {!signedIn ? (
          <View style={styles.fill}>
            <EmptyState
              title="Nothing saved yet"
              body="Save places you want to remember, come back to, or build into an evening."
              action={
                <View style={styles.actions}>
                  <Button label="Explore places" onPress={() => router.push("/search")} />
                  <Pressable accessibilityRole="button" accessibilityLabel="Log in" onPress={() => setOpen(true)} style={styles.login}>
                    <AppText role="label">Log in</AppText>
                  </Pressable>
                </View>
              }
            />
          </View>
        ) : null}
        {signedIn && (saves.isLoading || collections.isLoading) ? (
          <View style={styles.stack}>
            <Skeleton height={92} />
            <Skeleton height={120} />
          </View>
        ) : null}
        {signedIn && (saves.isError || collections.isError) ? (
          <ErrorState
            title="Nothing came through."
            body="Give it another try."
            onRetry={() => {
              void saves.refetch();
              void collections.refetch();
            }}
          />
        ) : null}
        {signedIn && collections.data ? (
          <View>
            <SectionHeader title="Collections" />
            {collections.data.items.length === 0 ? (
              <EmptyState title="No collections yet" body="Group the places you want to keep together." />
            ) : (
              <Rail>
                {collections.data.items.map((item) => (
                  <CollectionCard key={item.id} title={item.title} />
                ))}
              </Rail>
            )}
            <View style={styles.create}>
              <AppText role="label">New collection</AppText>
              <SearchField value={title} onChangeText={setTitle} placeholder="Collection name" hideIcon onSubmit={() => void createCollection()} />
              <Button label="Create" onPress={() => void createCollection()} />
            </View>
          </View>
        ) : null}
        {signedIn && saves.data ? (
          <View style={styles.stack}>
            <SectionHeader title="Recently saved" />
            {saves.data.items.length === 0 ? <EmptyState title="Nothing saved yet" body="Save places you want to come back to." /> : null}
            {saves.data.items.slice(0, 12).map((item, index) => {
              const subject = subjects[index];
              if (!subject || subject.isLoading) return <Skeleton key={item.id} height={88} />;
              if (subject.isError || !subject.data) {
                return (
                  <Card key={item.id}>
                    <AppText role="label">Saved place</AppText>
                    <AppText role="caption" tone="muted">
                      This one could not be loaded.
                    </AppText>
                  </Card>
                );
              }
              const photo = subject.data.images?.[0]?.url;
              const where = [subject.data.category ?? kindLabel(subject.data.kind), subject.data.locality].filter(Boolean).join(" · ");
              return (
                <Card key={item.id}>
                  {photo ? <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" accessibilityLabel={subject.data.title} /> : null}
                  <AppText role="caption" tone="muted">
                    {where || kindLabel(subject.data.kind)}
                  </AppText>
                  <AppText role="headline">{subject.data.title}</AppText>
                  {subject.data.startsAt ? (
                    <AppText role="caption" tone="muted">
                      {new Date(subject.data.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </AppText>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
      <SignInSheet visible={open} onClose={() => setOpen(false)} onSignedIn={() => void refresh()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[5], paddingTop: space[3], paddingBottom: space[8] },
  fill: { flex: 1, justifyContent: "center" },
  actions: { gap: space[2], marginTop: space[2] },
  login: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  intro: { gap: 4 },
  stack: { gap: space[3] },
  create: { gap: space[2], marginTop: space[4] },
  photo: { height: 140, borderRadius: 16, width: "100%" },
});
