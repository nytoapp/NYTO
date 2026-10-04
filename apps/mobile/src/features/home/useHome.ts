import { useQuery } from "@tanstack/react-query";
import type { HomeResponse } from "@atlas/contracts";
import { apiRequest } from "../../api/client";
import { useDiscoveryLocation } from "../location/location-store";

export function useHome() {
  const selected = useDiscoveryLocation((state) => state.selected);
  const hydrated = useDiscoveryLocation((state) => state.hydrated);
  return useQuery({
    queryKey: ["home", selected?.id ?? "none"],
    enabled: hydrated,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selected?.id) {
        params.set("selectedLocationId", selected.id);
      }
      const response = await apiRequest<HomeResponse>(`/api/v1/home?${params.toString()}`);
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "The city guide could not be loaded.");
      }
      return response.data;
    },
  });
}
