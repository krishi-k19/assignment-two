import { isAuthorized, unauthorizedResponse } from "@/lib/auth";
import { serializeWrite } from "@/lib/jsonStore";
import {
  deleteBlogPost,
  updateBlogPost,
  validateBlogUpdate,
} from "@/lib/blogStore";

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }
  return id;
}

export async function PUT(request, { params }) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) {
    return Response.json(
      { error: "Blog post id must be a positive integer." },
      { status: 400 }
    );
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
  const { errors, patch } = validateBlogUpdate(body);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }
  try {
    const post = await serializeWrite(() => updateBlogPost(id, patch));
    if (!post) {
      return Response.json({ error: "Blog post not found." }, { status: 404 });
    }
    return Response.json({ ok: true, post });
  } catch {
    return Response.json(
      { error: "Could not save the blog post. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) {
    return Response.json(
      { error: "Blog post id must be a positive integer." },
      { status: 400 }
    );
  }
  try {
    const deleted = await serializeWrite(() => deleteBlogPost(id));
    if (!deleted) {
      return Response.json({ error: "Blog post not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Could not delete the blog post. Please try again." },
      { status: 500 }
    );
  }
}
