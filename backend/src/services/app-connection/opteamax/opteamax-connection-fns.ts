import { AxiosError, isAxiosError } from "axios";

import { createRequestClient } from "@app/lib/config/request";
import { BadRequestError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { IntegrationUrls } from "@app/services/integration-auth/integration-list";

import { OpteamaxConnectionMethod } from "./opteamax-connection-enum";
import { TOpteamaxConnectionConfig, TOpteamaxZone } from "./opteamax-connection-types";

type TOpteamaxZoneListResponse = { domain_id: number; domain: string }[];

export const OPTEAMAX_REQUEST_TIMEOUT_MS = 10_000;

export const opteamaxRequest = createRequestClient({ timeout: OPTEAMAX_REQUEST_TIMEOUT_MS });

// every path must end in a slash: the API answers a missing one with a redirect, which drops the request body
export const getOpteamaxUrl = (path: string) => `${IntegrationUrls.OPTEAMAX_API_URL}${path}`;

export const makeOpteamaxAuthHeaders = (apiToken: string) => ({
  Authorization: `Bearer ${apiToken}`,
  Accept: "application/json"
});

export const getOpteamaxErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown } | undefined;
    if (typeof data?.detail === "string" && data.detail) return data.detail;
    return error.message || "Unknown error";
  }
  return error instanceof Error ? error.message : "Unknown error";
};

export const getOpteamaxConnectionListItem = () => {
  return {
    name: "Opteamax" as const,
    app: AppConnection.Opteamax as const,
    methods: Object.values(OpteamaxConnectionMethod) as [OpteamaxConnectionMethod.ApiToken]
  };
};

export const listOpteamaxZones = async (config: TOpteamaxConnectionConfig): Promise<TOpteamaxZone[]> => {
  if (config.method !== OpteamaxConnectionMethod.ApiToken) {
    throw new BadRequestError({ message: "Unsupported Opteamax connection method" });
  }

  try {
    const { data } = await opteamaxRequest.get<TOpteamaxZoneListResponse>(getOpteamaxUrl("/dns/domains/"), {
      headers: makeOpteamaxAuthHeaders(config.credentials.apiToken)
    });

    return data.map((zone) => ({ id: String(zone.domain_id), name: zone.domain }));
  } catch (error) {
    logger.error(error, "Error listing Opteamax zones");
    throw new BadRequestError({ message: `Failed to list Opteamax zones: ${getOpteamaxErrorMessage(error)}` });
  }
};

export const validateOpteamaxConnectionCredentials = async (config: TOpteamaxConnectionConfig) => {
  if (config.method !== OpteamaxConnectionMethod.ApiToken) {
    throw new BadRequestError({ message: "Unsupported Opteamax connection method" });
  }

  try {
    await opteamaxRequest.get(getOpteamaxUrl("/dns/domains/"), {
      headers: makeOpteamaxAuthHeaders(config.credentials.apiToken)
    });
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new BadRequestError({ message: `Failed to validate credentials: ${getOpteamaxErrorMessage(error)}` });
    }
    logger.error(error, "Error validating Opteamax connection credentials");
    throw new BadRequestError({ message: "Unable to validate connection: verify credentials" });
  }

  return config.credentials;
};
