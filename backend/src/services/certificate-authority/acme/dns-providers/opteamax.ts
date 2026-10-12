import { TKeyStoreFactory } from "@app/keystore/keystore";
import { logger } from "@app/lib/logger";
import {
  getOpteamaxErrorMessage,
  getOpteamaxUrl,
  makeOpteamaxAuthHeaders,
  OPTEAMAX_REQUEST_TIMEOUT_MS,
  opteamaxRequest
} from "@app/services/app-connection/opteamax/opteamax-connection-fns";
import { TOpteamaxConnection } from "@app/services/app-connection/opteamax/opteamax-connection-types";

import { withDnsRecordLock } from "./dns-record-lock";

const TXT_RECORD_TTL = 60;
const RECORD_LOCK_TTL_MS = OPTEAMAX_REQUEST_TIMEOUT_MS * 2 + 30_000;

export type TOpteamaxProviderDeps = {
  keyStore: Pick<TKeyStoreFactory, "acquireLock">;
};

type TOpteamaxRecord = {
  data_id: string;
  type: string;
  name: string;
  content: string;
};

const toFullyQualifiedName = (name: string) => (name.endsWith(".") ? name : `${name}.`);

const unquote = (value: string) => (value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value);

const getRecordsUrl = (zoneId: string) => getOpteamaxUrl(`/dns/domains/${encodeURIComponent(zoneId)}/records/`);

// the API has no lookup by name, so the challenge record is picked out of the zone's full record list
const findTxtRecord = async (apiToken: string, zoneId: string, name: string, value: string) => {
  const { data } = await opteamaxRequest.get<TOpteamaxRecord[]>(getRecordsUrl(zoneId), {
    headers: makeOpteamaxAuthHeaders(apiToken)
  });

  return data.find(
    (record) =>
      record.type === "TXT" &&
      record.name.toLowerCase() === name.toLowerCase() &&
      unquote(record.content) === unquote(value)
  );
};

export const opteamaxInsertTxtRecord = async (
  connection: TOpteamaxConnection,
  zoneId: string,
  recordName: string,
  value: string,
  { keyStore }: TOpteamaxProviderDeps
) => {
  const { apiToken } = connection.credentials;
  const name = toFullyQualifiedName(recordName);

  logger.info({ zoneId, name }, `Inserting TXT record for Opteamax [zoneId=${zoneId}] [name=${name}]`);

  try {
    // the API rewrites the whole record set on every change, so two challenges for the same name must not overlap
    await withDnsRecordLock(
      { providerName: "Opteamax", connectionId: connection.id, zoneId, name, lockTtlMs: RECORD_LOCK_TTL_MS },
      keyStore,
      async () => {
        if (await findTxtRecord(apiToken, zoneId, name, value)) return;

        await opteamaxRequest.post(
          getRecordsUrl(zoneId),
          { type: "TXT", name, content: value, ttl: TXT_RECORD_TTL },
          { headers: { ...makeOpteamaxAuthHeaders(apiToken), "Content-Type": "application/json" } }
        );
      }
    );
  } catch (error) {
    throw new Error(
      `Failed to create Opteamax TXT record '${name}' in zone '${zoneId}': ${getOpteamaxErrorMessage(error)}`,
      { cause: error }
    );
  }
};

export const opteamaxDeleteTxtRecord = async (
  connection: TOpteamaxConnection,
  zoneId: string,
  recordName: string,
  value: string,
  { keyStore }: TOpteamaxProviderDeps
) => {
  const { apiToken } = connection.credentials;
  const name = toFullyQualifiedName(recordName);

  logger.info({ zoneId, name }, `Deleting TXT record for Opteamax [zoneId=${zoneId}] [name=${name}]`);

  try {
    await withDnsRecordLock(
      { providerName: "Opteamax", connectionId: connection.id, zoneId, name, lockTtlMs: RECORD_LOCK_TTL_MS },
      keyStore,
      async () => {
        const record = await findTxtRecord(apiToken, zoneId, name, value);

        if (!record) {
          logger.warn({ zoneId, name }, "Opteamax TXT record to delete not found");
          return;
        }

        await opteamaxRequest.delete(`${getRecordsUrl(zoneId)}${encodeURIComponent(record.data_id)}/`, {
          headers: makeOpteamaxAuthHeaders(apiToken)
        });
      }
    );
  } catch (error) {
    throw new Error(
      `Failed to delete Opteamax TXT record '${name}' in zone '${zoneId}': ${getOpteamaxErrorMessage(error)}`,
      { cause: error }
    );
  }
};
