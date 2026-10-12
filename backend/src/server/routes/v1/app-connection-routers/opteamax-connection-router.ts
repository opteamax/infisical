import z from "zod";

import { readLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import {
  CreateOpteamaxConnectionSchema,
  SanitizedOpteamaxConnectionSchema,
  UpdateOpteamaxConnectionSchema
} from "@app/services/app-connection/opteamax/opteamax-connection-schema";
import { AuthMode } from "@app/services/auth/auth-type";

import { registerAppConnectionEndpoints } from "./app-connection-endpoints";

export const registerOpteamaxConnectionRouter = async (server: FastifyZodProvider) => {
  registerAppConnectionEndpoints({
    app: AppConnection.Opteamax,
    server,
    sanitizedResponseSchema: SanitizedOpteamaxConnectionSchema,
    createSchema: CreateOpteamaxConnectionSchema,
    updateSchema: UpdateOpteamaxConnectionSchema
  });

  server.route({
    method: "GET",
    url: `/:connectionId/opteamax-zones`,
    config: {
      rateLimit: readLimit
    },
    schema: {
      operationId: "listOpteamaxZones",
      params: z.object({
        connectionId: z.string().uuid().describe("The ID of the Opteamax Connection to list zones from.")
      }),
      response: {
        200: z
          .object({
            id: z.string().describe("The ID of the Opteamax zone."),
            name: z.string().describe("The name of the Opteamax zone.")
          })
          .array()
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.OAUTH]),
    handler: async (req) => {
      const { connectionId } = req.params;
      const zones = await server.services.appConnection.opteamax.listZones(connectionId, req.permission);
      return zones;
    }
  });
};
