import z from "zod";

import { AppConnections } from "@app/lib/api-docs";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import {
  BaseAppConnectionSchema,
  GenericCreateAppConnectionFieldsSchema,
  GenericUpdateAppConnectionFieldsSchema
} from "@app/services/app-connection/app-connection-schemas";

import { APP_CONNECTION_NAME_MAP } from "../app-connection-maps";
import { OpteamaxConnectionMethod } from "./opteamax-connection-enum";

export const OpteamaxConnectionApiTokenCredentialsSchema = z.object({
  apiToken: z
    .string()
    .trim()
    .min(1, "API token required")
    .max(256, "API token cannot exceed 256 characters")
    .describe("The Opteamax API token. Create it in the customer panel under API-Tokens; it starts with oxt_.")
});

const BaseOpteamaxConnectionSchema = BaseAppConnectionSchema.extend({
  app: z.literal(AppConnection.Opteamax)
});

export const OpteamaxConnectionSchema = BaseOpteamaxConnectionSchema.extend({
  method: z.literal(OpteamaxConnectionMethod.ApiToken),
  credentials: OpteamaxConnectionApiTokenCredentialsSchema
});

export const SanitizedOpteamaxConnectionSchema = z.discriminatedUnion("method", [
  BaseOpteamaxConnectionSchema.extend({
    method: z.literal(OpteamaxConnectionMethod.ApiToken),
    credentials: OpteamaxConnectionApiTokenCredentialsSchema.pick({})
  }).describe(JSON.stringify({ title: `${APP_CONNECTION_NAME_MAP[AppConnection.Opteamax]} (API Token)` }))
]);

export const ValidateOpteamaxConnectionCredentialsSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal(OpteamaxConnectionMethod.ApiToken).describe(AppConnections.CREATE(AppConnection.Opteamax).method),
    credentials: OpteamaxConnectionApiTokenCredentialsSchema.describe(
      AppConnections.CREATE(AppConnection.Opteamax).credentials
    )
  })
]);

export const CreateOpteamaxConnectionSchema = ValidateOpteamaxConnectionCredentialsSchema.and(
  GenericCreateAppConnectionFieldsSchema(AppConnection.Opteamax)
);

export const UpdateOpteamaxConnectionSchema = z
  .object({
    credentials: OpteamaxConnectionApiTokenCredentialsSchema.optional().describe(
      AppConnections.UPDATE(AppConnection.Opteamax).credentials
    )
  })
  .and(GenericUpdateAppConnectionFieldsSchema(AppConnection.Opteamax));

export const OpteamaxConnectionListItemSchema = z
  .object({
    name: z.literal("Opteamax"),
    app: z.literal(AppConnection.Opteamax),
    methods: z.nativeEnum(OpteamaxConnectionMethod).array()
  })
  .describe(JSON.stringify({ title: APP_CONNECTION_NAME_MAP[AppConnection.Opteamax] }));
