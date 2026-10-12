import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { TRootAppConnection } from "@app/hooks/api/appConnections/types/root-connection";

export enum OpteamaxConnectionMethod {
  ApiToken = "api-token"
}

export type TOpteamaxConnection = TRootAppConnection & { app: AppConnection.Opteamax } & {
  method: OpteamaxConnectionMethod.ApiToken;
  credentials: {
    apiToken: string;
  };
};
