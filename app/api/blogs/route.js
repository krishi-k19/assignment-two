import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { serializeWrite } from "@/lib/jsonStore";
import {
  createBlogPost,
  listBlogPosts,
  validateBlogInput,
} from "@/lib/blogStore";

export async function GET(request) {
  const publicOnly = !isAuthorized(request);
  try {
    const posts = await listBlogPosts({ publicOnly });
    return Response.json({ posts });
  } catch {
    return Response.json(
      { error: "Could not load blog posts." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const { errors, fields, isPublic, tags } = validateBlogInput(body);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }
  try {
    const post = await serializeWrite(() =>
      createBlogPost(fields, tags, isPublic)
    );
    return Response.json(
      { ok: true, id: post.id, slug: post.slug },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { error: "Could not save the blog post. Please try again." },
      { status: 500 }
    );
  }
}
