import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { SubjectDetail } from "@atlas/contracts";
import { CollectionCard, Rail, SectionHeader } from "../../components/discovery";
import { AppText, Button, Card, EmptyState, ErrorState, Screen, SearchField, Skeleton } from "../../components/ui";
import { space } from "../../components/theme/tokens";
import { apiRequest } from "../../api/client";
import { SignInSheet } from "../auth/SignInSheet";
import { useSession } from "../auth/useSession";

type SaveList = { items: { id: string; subjectId: string }[] };
type CollectionList = { items: { id: string; title: string }[] };

export function SavedScreen() {
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
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <AppText role="caption" tone="muted">
            Library
          </AppText>
          <AppText role="title">Saved</AppText>
        </View>
        {!signedIn ? (
          <Card>
            <AppText role="headline">Keep the places you want to return to</AppText>
            <AppText tone="muted">Sign in to build collections across cities. Saves stay on your account, not only on this phone.</AppText>
            <Button label="Sign in" onPress={() => setOpen(true)} />
          </Card>
        ) : null}
        {signedIn && (saves.isLoading || collections.isLoading) ? (
          <View style={styles.stack}>
            <Skeleton height={92} />
            <Skeleton height={120} />
          </View>
        ) : null}
        {signedIn && (saves.isError || collections.isError) ? (
          <ErrorState
            title="Saved places could not be loaded"
            body="Check that the API is running, then try again."
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
              <EmptyState title="No collections yet" body="Group a trip, a neighborhood, or a kind of place." />
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
            {saves.data.items.length === 0 ? <EmptyState title="Nothing saved yet" body="Places you save from discovery will appear here." /> : null}
            {saves.data.items.slice(0, 12).map((item, index) => {
              const subject = subjects[index];
              if (!subject || subject.isLoading) return <Skeleton key={item.id} height={88} />;
              if (subject.isError || !subject.data) {
                return (
                  <Card key={item.id}>
                    <AppText role="label">Saved item</AppText>
                    <AppText role="caption" tone="muted">
                      The catalog record is unavailable.
                    </AppText>
                  </Card>
                );
              }
              return (
                <Card key={item.id}>
                  <AppText role="caption" tone="muted">
                    {subject.data.kind}
                  </AppText>
                  <AppText role="headline">{subject.data.title}</AppText>
                  {subject.data.summary ? (
                    <AppText role="caption" tone="muted" numberOfLines={2}>
                      {subject.data.summary}
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
  intro: { gap: 4 },
  stack: { gap: space[3] },
  create: { gap: space[2], marginTop: space[4] },
});
