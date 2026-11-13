import { createHash, createHmac, scryptSync, timingSafeEqual } from "crypto";
import { headers } from "next/headers";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function parseStoredHash(stored) {
  const parts = String(stored).trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return null;
  }
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N <= 0 ||
    r <= 0 ||
    p <= 0 ||
    salt.length === 0 ||
    expected.length === 0
  ) {
    return null;
  }
  return { expected, N, p, r, salt };
}

function safeEqualText(left, right) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function verifyCredentials(username, password) {
  const expectedUsername = (process.env.ADMIN_USERNAME ?? "").trim();
  const parsed = parseStoredHash((process.env.ADMIN_PASSWORD_HASH ?? "").trim());
  if (!expectedUsername || !parsed) {
    return false;
  }
  if (!safeEqualText(username, expectedUsername)) {
    return false;
  }
  const actual = scryptSync(password, parsed.salt, parsed.expected.length, {
    N: parsed.N,
    p: parsed.p,
    r: parsed.r,
  });
  return timingSafeEqual(actual, parsed.expected);
}

const verifiedHeaderCache = new Map();
const VERIFIED_CACHE_LIMIT = 16;

function verifyAuthHeaderValue(header) {
  if (!/^basic /i.test(header)) {
    return false;
  }
  let decoded;
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return false;
  }
  return verifyCredentials(
    decoded.slice(0, separator),
    decoded.slice(separator + 1)
  );
}

function verifyAuthHeader(headerValue) {
  const header = String(headerValue ?? "");
  const cached = verifiedHeaderCache.get(header);
  if (cached !== undefined) {
    return cached;
  }
  const result = verifyAuthHeaderValue(header);
  if (result) {
    if (verifiedHeaderCache.size >= VERIFIED_CACHE_LIMIT) {
      const oldest = verifiedHeaderCache.keys().next().value;
      verifiedHeaderCache.delete(oldest);
    }
    verifiedHeaderCache.set(header, true);
  }
  return result;
}

function sessionSecret() {
  return (
    process.env.SESSION_SECRET ??
    process.env.ADMIN_PASSWORD_HASH ??
    ""
  ).trim();
}

function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString("base64url");
  const signature = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [payload, signature] = parts;
  const expectedSignature = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  if (!safeEqualText(signature, expectedSignature)) {
    return false;
  }
  let expires;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    expires = parsed.exp;
  } catch {
    return false;
  }
  return Number.isInteger(expires) && expires > Math.floor(Date.now() / 1000);
}

function extractCookieValue(cookieHeader, name) {
  const header = String(cookieHeader ?? "");
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return "";
}

function sessionCookieHeader(token) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }
  attributes.push(`Max-Age=${SESSION_TTL_SECONDS}`);
  return attributes.join("; ");
}

function clearedSessionCookieHeader() {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }
  attributes.push("Max-Age=0");
  return attributes.join("; ");
}

function isAuthorizedCookies(cookieHeader) {
  return verifySessionToken(
    extractCookieValue(cookieHeader, SESSION_COOKIE_NAME)
  );
}

function isAuthorized(request) {
  if (isAuthorizedCookies(request.headers.get("cookie"))) {
    return true;
  }
  return verifyAuthHeader(request.headers.get("authorization"));
}

async function isAuthorizedFromHeaders() {
  const headerList = await headers();
  if (isAuthorizedCookies(headerList.get("cookie"))) {
    return true;
  }
  return verifyAuthHeader(headerList.get("authorization"));
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Authentication required." }), {
    status: 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="Portfolio Admin", charset="UTF-8"',
    },
  });
}

export {
  SESSION_COOKIE_NAME,
  clearedSessionCookieHeader,
  createSessionToken,
  isAuthorized,
  isAuthorizedFromHeaders,
  sessionCookieHeader,
  unauthorizedResponse,
  verifyAuthHeader,
  verifyCredentials,
};
