import {
  clearedSessionCookieHeader,
  createSessionToken,
  sessionCookieHeader,
  verifyCredentials,
} from "@/lib/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyCredentials(username, password)) {
    return Response.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": sessionCookieHeader(createSessionToken()),
    },
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": clearedSessionCookieHeader(),
    },
  });
}
