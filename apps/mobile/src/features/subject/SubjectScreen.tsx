import { useQuery } from "@tanstack/react-query";
import type { SubjectDetail } from "@atlas/contracts";
import { View } from "react-native";
import { apiRequest } from "../../api/client";
import { AppText, ErrorState, ImageFrame, Screen, Skeleton } from "../../components/ui";
import { space } from "../../components/theme/tokens";

export function SubjectScreen({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["subject", id],
    queryFn: async () => {
      const response = await apiRequest<SubjectDetail>(`/api/v1/subjects/${id}`);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });
  if (query.isLoading) {
    return <Screen><Skeleton height={180} /></Screen>;
  }
  if (query.isError || !query.data) {
    return <Screen><ErrorState title="Unavailable" body="This item could not be loaded." onRetry={() => void query.refetch()} /></Screen>;
  }
  return (
    <Screen>
      <View style={{ gap: space[3] }}>
        <ImageFrame label={query.data.title} />
        <AppText role="caption" tone="muted">{query.data.kind}</AppText>
        <AppText role="title">{query.data.title}</AppText>
        {query.data.summary ? <AppText tone="muted">{query.data.summary}</AppText> : null}
      </View>
    </Screen>
  );
}
