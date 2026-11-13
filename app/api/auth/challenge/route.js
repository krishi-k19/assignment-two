import { isAuthorized } from "@/lib/auth";

function challengeDeniedResponse() {
  return new Response(
    `<!doctype html><html lang="en"><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>Sign-in failed</h1><p>Sign-in was cancelled or the credentials were rejected.</p><p><a href="/admin/blogs">Try again</a></p></body></html>`,
    {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "WWW-Authenticate": 'Basic realm="Portfolio Admin", charset="UTF-8"',
      },
    }
  );
}

export async function GET(request) {
  if (isAuthorized(request)) {
    return Response.redirect(new URL("/admin/blogs", request.url), 302);
  }
  return challengeDeniedResponse();
}
