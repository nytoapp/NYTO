import { useMutation } from "@tanstack/react-query";
import type { SearchResponse } from "@atlas/contracts";
import { apiRequest } from "../../api/client";
import { useDiscoveryLocation } from "../location/location-store";

export function useSearch() {
  const selected = useDiscoveryLocation((state) => state.selected);
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest<SearchResponse>("/api/v1/search", {
        method: "POST",
        body: JSON.stringify({
          query,
          locale: "en",
          context: { device: null, selectedLocationId: selected?.id ?? null, tripId: null },
        }),
      });
      if (response.error) {
        throw Object.assign(new Error(response.error.message), { code: response.error.code, requestId: response.error.requestId });
      }
      return response;
    },
  });
}
