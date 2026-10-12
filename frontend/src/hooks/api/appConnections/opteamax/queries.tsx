import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";

import { appConnectionKeys } from "../queries";
import { TOpteamaxZone } from "./types";

const opteamaxConnectionKeys = {
  all: [...appConnectionKeys.all, "opteamax"] as const,
  listZones: (connectionId: string) =>
    [...opteamaxConnectionKeys.all, "zones", connectionId] as const
};

export const useOpteamaxConnectionListZones = (
  connectionId: string,
  options?: Omit<
    UseQueryOptions<
      TOpteamaxZone[],
      unknown,
      TOpteamaxZone[],
      ReturnType<typeof opteamaxConnectionKeys.listZones>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: opteamaxConnectionKeys.listZones(connectionId),
    queryFn: async () => {
      const { data } = await apiRequest.get<TOpteamaxZone[]>(
        `/api/v1/app-connections/opteamax/${connectionId}/opteamax-zones`
      );

      return data;
    },
    ...options
  });
};
