import { NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import {
  agentLastWrite,
  isRegistryConfigured,
  writeAgent,
  type AgentLink,
  type AgentRecord,
} from "@/lib/agents";

/**
 * /api/points/register — self-serve AI-agent registration.
 *
 * The agent signs a short 4-line message with its own wallet (EIP-191
 * personal_sign) and POSTs it here. The server recovers the signer, checks the
 * timestamp, rate-limits, and stores the record in KV (see lib/agents.ts).
 *
 *   Spirit Cards — agent registration
 *   address: <lowercase address>
 *   name: <name>
 *   timestamp: <unix seconds>
 *
 * Codes: 200 registered · 400 invalid body · 401 bad signature / stale
 * timestamp · 429 rate limited · 503 registry storage not provisioned.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MAX_NAME = 64;
const MAX_DESCRIPTION = 280;
const MAX_LINKS = 5;
const MAX_LABEL = 64;
const MAX_URL = 512;
const MAX_SKEW_SECONDS = 900;
/** One successful registration per address per window. */
const REREGISTER_COOLDOWN_MS = 60_000;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_RE = /^0x[0-9a-fA-F]{130}$/;
const TIMESTAMP_LINE_RE = /^timestamp:\s*(\d{1,20})$/;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function unauthorized(error: string) {
  return NextResponse.json({ error }, { status: 401 });
}

function tooMany() {
  return NextResponse.json({ error: "rate limited" }, { status: 429 });
}

function notProvisioned() {
  return NextResponse.json({ error: "registry storage not provisioned" }, { status: 503 });
}

/** Sanitised links, `[]` when absent, or `null` when the shape is invalid. */
function validateLinks(input: unknown): AgentLink[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return null;
  if (input.length > MAX_LINKS) return null;
  const links: AgentLink[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    if (!label || label.length > MAX_LABEL || !url || url.length > MAX_URL) return null;
    links.push({ label, url });
  }
  return links;
}

/** Read "timestamp: <unix>" from the last non-empty line of the message. */
function parseTimestamp(message: string): number | null {
  const lines = message.replace(/\r\n/g, "\n").replace(/\s+$/, "").split("\n");
  const last = lines[lines.length - 1]?.trim() ?? "";
  const match = TIMESTAMP_LINE_RE.exec(last);
  if (!match) return null;
  const ts = Number(match[1]);
  return Number.isFinite(ts) ? ts : null;
}

export async function POST(request: Request) {
  // 1. Body must be a JSON object.
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return badRequest("invalid body");
  }
  if (!parsed || typeof parsed !== "object") return badRequest("invalid body");
  const body = parsed as Record<string, unknown>;

  // 2. Field validation.
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME) return badRequest("invalid name");

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!ADDRESS_RE.test(address)) return badRequest("invalid address");

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description || description.length > MAX_DESCRIPTION) return badRequest("invalid description");

  const message = typeof body.message === "string" ? body.message : "";
  if (!message) return badRequest("invalid message");

  const signature = typeof body.signature === "string" ? body.signature.trim() : "";
  if (!SIGNATURE_RE.test(signature)) return badRequest("invalid signature");

  const links = validateLinks(body.links);
  if (links === null) return badRequest("invalid links");

  // 3. Storage must be provisioned before we can rate-limit or store.
  if (!isRegistryConfigured()) return notProvisioned();

  const addrLower = address.toLowerCase();

  // 4. Rate limiting: one registration per address per cooldown window.
  const lastWrite = await agentLastWrite(addrLower);
  if (lastWrite !== null && Date.now() - lastWrite < REREGISTER_COOLDOWN_MS) {
    return tooMany();
  }

  // 5. Timestamp freshness (±15 minutes).
  const timestamp = parseTimestamp(message);
  if (timestamp === null) return unauthorized("stale timestamp");
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_SKEW_SECONDS) return unauthorized("stale timestamp");

  // 6. Signature must recover to the claimed address.
  let recovered: string;
  try {
    recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return unauthorized("bad signature");
  }
  if (recovered.toLowerCase() !== addrLower) return unauthorized("bad signature");

  // 7. Persist.
  const record: AgentRecord = {
    address: addrLower,
    name,
    description,
    registeredAt: new Date().toISOString(),
  };
  if (links.length > 0) record.links = links;

  const stored = await writeAgent(record);
  if (!stored) return notProvisioned();

  return NextResponse.json({ ok: true, address: addrLower, listed: true });
}
