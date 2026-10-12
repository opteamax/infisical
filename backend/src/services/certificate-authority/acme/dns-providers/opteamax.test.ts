import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TOpteamaxConnection } from "@app/services/app-connection/opteamax/opteamax-connection-types";

const { getMock, postMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn<(url: string, config?: unknown) => Promise<unknown>>(),
  postMock: vi.fn<(url: string, body?: unknown, config?: unknown) => Promise<unknown>>(),
  deleteMock: vi.fn<(url: string, config?: unknown) => Promise<unknown>>()
}));

vi.mock("@app/lib/config/request", () => ({
  createRequestClient: () => ({ get: getMock, post: postMock, delete: deleteMock })
}));
vi.mock("@app/lib/delay", () => ({ delay: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@app/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

// eslint-disable-next-line import/first
import { TDnsRecordLockKeyStore } from "./dns-record-lock";
// eslint-disable-next-line import/first
import { opteamaxDeleteTxtRecord, opteamaxInsertTxtRecord } from "./opteamax";

const connection = { id: "connection-id", credentials: { apiToken: "oxt_token" } } as TOpteamaxConnection;
const keyStore = {
  acquireLock: vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) })
} as unknown as TDnsRecordLockKeyStore;
const ZONE_ID = "881";
const RECORDS_URL = `https://api.opteam.ax/api/v2/dns/domains/${ZONE_ID}/records/`;
const RECORD = "_acme-challenge.example.com";
const FQDN = `${RECORD}.`;
const VALUE = '"challenge-value"';

const txtRecord = (content: string, name = FQDN, dataId = `id-${content}`) => ({
  data_id: dataId,
  type: "TXT",
  name,
  content,
  ttl: 60
});

const axiosError = (status: number, detail: string) =>
  new AxiosError("request failed", String(status), undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { detail }
  });

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  deleteMock.mockReset();
});

describe("opteamaxInsertTxtRecord", () => {
  it("creates the record under its fully qualified name", async () => {
    getMock.mockResolvedValue({ data: [] });
    postMock.mockResolvedValue({ data: {} });

    await opteamaxInsertTxtRecord(connection, ZONE_ID, RECORD, VALUE, { keyStore });

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][0]).toBe(RECORDS_URL);
    expect(postMock.mock.calls[0][1]).toEqual({ type: "TXT", name: FQDN, content: VALUE, ttl: 60 });
  });

  it("adds a second value next to an existing one on the same name", async () => {
    getMock.mockResolvedValue({ data: [txtRecord('"other-value"')] });
    postMock.mockResolvedValue({ data: {} });

    await opteamaxInsertTxtRecord(connection, ZONE_ID, RECORD, VALUE, { keyStore });

    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the record already exists", async () => {
    getMock.mockResolvedValue({ data: [txtRecord(VALUE, FQDN.toUpperCase())] });

    await opteamaxInsertTxtRecord(connection, ZONE_ID, RECORD, VALUE, { keyStore });

    expect(postMock).not.toHaveBeenCalled();
  });

  it("surfaces the reason the API gives", async () => {
    getMock.mockResolvedValue({ data: [] });
    postMock.mockRejectedValue(axiosError(403, "Access denied to domain"));

    await expect(opteamaxInsertTxtRecord(connection, ZONE_ID, RECORD, VALUE, { keyStore })).rejects.toThrow(
      /Failed to create Opteamax TXT record.*Access denied to domain/
    );
  });
});

describe("opteamaxDeleteTxtRecord", () => {
  it("removes only the record holding this challenge value", async () => {
    getMock.mockResolvedValue({
      data: [
        txtRecord('"other-value"', FQDN, "other-id"),
        txtRecord(VALUE, "_acme-challenge.www.example.com.", "wrong-name-id"),
        { ...txtRecord(VALUE, FQDN, "wrong-type-id"), type: "CNAME" },
        txtRecord(VALUE, FQDN, "record/id")
      ]
    });
    deleteMock.mockResolvedValue({ data: {} });

    await opteamaxDeleteTxtRecord(connection, ZONE_ID, RECORD, VALUE, { keyStore });

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock.mock.calls[0][0]).toBe(`${RECORDS_URL}record%2Fid/`);
  });

  it("does nothing when the record is already gone", async () => {
    getMock.mockResolvedValue({ data: [] });

    await opteamaxDeleteTxtRecord(connection, ZONE_ID, RECORD, VALUE, { keyStore });

    expect(deleteMock).not.toHaveBeenCalled();
  });
});
