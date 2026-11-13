import { serializeWrite } from "./jsonStore";
import { appendContactSubmission, validateContactBody } from "./contactStore";

async function handleContactPost(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { errors, fields } = validateContactBody(body);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  try {
    const submission = await serializeWrite(() =>
      appendContactSubmission(fields)
    );
    return Response.json({ ok: true, id: submission.id }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Could not save your message. Please try again." },
      { status: 500 }
    );
  }
}

export { handleContactPost };
