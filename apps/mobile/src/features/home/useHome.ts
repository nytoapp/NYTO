import { useQuery } from "@tanstack/react-query";
import type { HomeResponse } from "@atlas/contracts";
import { apiRequest } from "../../api/client";
import { useDiscoveryLocation } from "../location/location-store";

export function useHome() {
  const selected = useDiscoveryLocation((state) => state.selected);
  return useQuery({
    queryKey: ["home", selected?.id ?? "none"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selected?.id) {
        params.set("selectedLocationId", selected.id);
      }
      const response = await apiRequest<HomeResponse>(`/api/v1/home?${params.toString()}`);
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });
}
