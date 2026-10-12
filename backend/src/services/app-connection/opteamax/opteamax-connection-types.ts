import z from "zod";

import { DiscriminativePick } from "@app/lib/types";

import { AppConnection } from "../app-connection-enums";
import {
  CreateOpteamaxConnectionSchema,
  OpteamaxConnectionSchema,
  ValidateOpteamaxConnectionCredentialsSchema
} from "./opteamax-connection-schema";

export type TOpteamaxConnection = z.infer<typeof OpteamaxConnectionSchema>;

export type TOpteamaxConnectionInput = z.infer<typeof CreateOpteamaxConnectionSchema> & {
  app: AppConnection.Opteamax;
};

export type TValidateOpteamaxConnectionCredentialsSchema = typeof ValidateOpteamaxConnectionCredentialsSchema;

export type TOpteamaxConnectionConfig = DiscriminativePick<
  TOpteamaxConnectionInput,
  "method" | "app" | "credentials"
> & {
  orgId: string;
};

export type TOpteamaxZone = {
  id: string;
  name: string;
};
