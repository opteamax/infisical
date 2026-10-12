import { OrgServiceActor } from "@app/lib/types";

import { AppConnection } from "../app-connection-enums";
import { listOpteamaxZones } from "./opteamax-connection-fns";
import { TOpteamaxConnection } from "./opteamax-connection-types";

type TGetAppConnectionFunc = (
  app: AppConnection,
  connectionId: string,
  actor: OrgServiceActor
) => Promise<TOpteamaxConnection>;

export const opteamaxConnectionService = (getAppConnection: TGetAppConnectionFunc) => {
  const listZones = async (connectionId: string, actor: OrgServiceActor) => {
    const appConnection = await getAppConnection(AppConnection.Opteamax, connectionId, actor);
    return listOpteamaxZones(appConnection);
  };

  return {
    listZones
  };
};
