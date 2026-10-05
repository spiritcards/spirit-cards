/**
 * agents.ts — Spirit Cards AI-agent registry (server-side persistence).
 *
 * Records are stored on Vercel Blob as one JSON document per agent:
 *
 *   agents/{lowercase-address}.json
 *
 * Enumeration is a prefix `list()`; there is no shared index object, so
 * concurrent registrations cannot corrupt each other. The registry is *not*
 * authoritative for ranking: on-chain activity points stay authoritative and
 * a registered address is merged into the `/api/points` leaderboard at read
 * time (see app/api/points/route.ts).
 *
 * Everything here is best-effort: with no BLOB_READ_WRITE_TOKEN the registry
 * degrades to an empty list rather than throwing, so the read surfaces keep
 * working even without storage.
 */
import { head, list, put } from "@vercel/blob";

export type AgentLink = { label: string; url: string };

export type AgentRecord = {
  /** Lowercase 0x address of the agent wallet. */
  address: string;
  name: string;
  description: string;
  links?: AgentLink[];
  /** ISO-8601 timestamp of registration. */
  registeredAt: string;
};

const AGENTS_PREFIX = "agents/";

/** True when Blob storage credentials are present in the environment. */
export function isRegistryConfigured(): boolean {
  return typeof process.env.BLOB_READ_WRITE_TOKEN === "string"
    && process.env.BLOB_READ_WRITE_TOKEN.length > 0;
}

function agentPath(address: string): string {
  return `${AGENTS_PREFIX}${address.toLowerCase()}.json`;
}

/** Validate and normalise a decoded JSON document into an AgentRecord. */
function parseAgent(raw: unknown): AgentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.address !== "string" || typeof obj.name !== "string") return null;

  const record: AgentRecord = {
    address: obj.address.toLowerCase(),
    name: obj.name,
    description: typeof obj.description === "string" ? obj.description : "",
    registeredAt: typeof obj.registeredAt === "string" ? obj.registeredAt : "",
  };

  if (Array.isArray(obj.links)) {
    const links: AgentLink[] = [];
    for (const link of obj.links) {
      if (!link || typeof link !== "object") continue;
      const l = link as Record<string, unknown>;
      if (typeof l.label !== "string" || typeof l.url !== "string") continue;
      links.push({ label: l.label, url: l.url });
    }
    if (links.length > 0) record.links = links;
  }

  return record;
}

/**
 * Read the whole registry. Returns `[]` when storage is unconfigured, empty,
 * or unreachable — this helper never throws.
 */
export async function readAgentRegistry(): Promise<AgentRecord[]> {
  if (!isRegistryConfigured()) return [];

  try {
    const { blobs } = await list({ prefix: AGENTS_PREFIX, limit: 200 });

    const reads = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const res = await fetch(blob.url, { cache: "no-store" });
          if (!res.ok) return null;
          return parseAgent(await res.json());
        } catch {
          return null;
        }
      }),
    );

    const records: AgentRecord[] = [];
    for (const record of reads) {
      if (record) records.push(record);
    }

    // Stable, deterministic order for callers (registration time, then address).
    records.sort((a, b) =>
      a.registeredAt === b.registeredAt
        ? a.address.localeCompare(b.address)
        : a.registeredAt.localeCompare(b.registeredAt),
    );
    return records;
  } catch (error) {
    console.error("[agents] registry list failed:", error);
    return [];
  }
}

/**
 * Persist one agent record (overwrites the previous record for the address).
 * Returns `false` when the write could not be confirmed.
 */
export async function writeAgent(record: AgentRecord): Promise<boolean> {
  if (!isRegistryConfigured()) return false;
  const address = record.address.toLowerCase();
  const stored: AgentRecord = { ...record, address };

  try {
    await put(agentPath(address), JSON.stringify(stored), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return true;
  } catch (error) {
    console.error("[agents] registry write failed:", error);
    return false;
  }
}

/**
 * Milliseconds timestamp of the last write for an address, or `null` when the
 * record does not exist (or storage is unreachable). Used for write cooldown.
 */
export async function agentLastWrite(address: string): Promise<number | null> {
  if (!isRegistryConfigured()) return null;
  try {
    const meta = await head(agentPath(address));
    const ms = meta?.uploadedAt ? new Date(meta.uploadedAt).getTime() : NaN;
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}
