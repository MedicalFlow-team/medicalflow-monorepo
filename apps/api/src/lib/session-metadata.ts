import { isIP } from "node:net";

const MAX_FORWARDED_FOR_LENGTH = 512;
const MAX_USER_AGENT_LENGTH = 512;
const SAFE_USER_AGENT_SUMMARY =
  /^(?:Edge|Opera|Chrome|Firefox|Safari|Other)\/(?:Windows|Android|iOS|macOS|ChromeOS|Linux|Other)$/;

const browserFamilies = [
  ["Edge", /Edg(?:A|iOS)?\//],
  ["Opera", /(?:OPR|Opera)\//],
  ["Chrome", /(?:Chrome|CriOS)\//],
  ["Firefox", /(?:Firefox|FxiOS)\//],
  ["Safari", /Safari\//],
] as const;

const platformFamilies = [
  ["Windows", /Windows NT/],
  ["Android", /Android/],
  ["iOS", /(?:iPhone|iPad|iPod)/],
  ["macOS", /Mac OS X/],
  ["ChromeOS", /CrOS/],
  ["Linux", /Linux/],
] as const;

export interface SessionMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

function normalizeIpAddress(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  const unwrapped =
    candidate.startsWith("[") && candidate.endsWith("]")
      ? candidate.slice(1, -1)
      : candidate;
  return isIP(unwrapped) === 0 ? null : unwrapped;
}

function forwardedClientIp(value: string | null): string | null {
  if (!value || value.length > MAX_FORWARDED_FOR_LENGTH) return null;
  return normalizeIpAddress(value.split(",").at(-1));
}

export function summarizeUserAgent(value: string | null): string | null {
  if (!value) return null;
  if (SAFE_USER_AGENT_SUMMARY.test(value)) return value;

  const userAgent = value.slice(0, MAX_USER_AGENT_LENGTH);
  const browser =
    browserFamilies.find(([, pattern]) => pattern.test(userAgent))?.[0] ??
    "Other";
  const platform =
    platformFamilies.find(([, pattern]) => pattern.test(userAgent))?.[0] ??
    "Other";

  return `${browser}/${platform}`;
}

export function sessionMetadataFromRequest(options: {
  request: Request;
  peerAddress: string | null;
  trustProxy: boolean;
}): SessionMetadata {
  const ipAddress = options.trustProxy
    ? (forwardedClientIp(options.request.headers.get("x-forwarded-for")) ??
      normalizeIpAddress(options.peerAddress))
    : normalizeIpAddress(options.peerAddress);

  return {
    ipAddress,
    userAgent: summarizeUserAgent(options.request.headers.get("user-agent")),
  };
}

export function safeSessionIpAddress(value: string | null): string | null {
  return normalizeIpAddress(value);
}
