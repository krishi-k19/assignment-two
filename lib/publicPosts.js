import { headers } from "next/headers";

export async function fetchPublicBlogPosts() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const response = await fetch(`${protocol}://${host}/api/blogs`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to load blog posts.");
  }
  const body = await response.json();
  return Array.isArray(body.posts) ? body.posts : [];
}
