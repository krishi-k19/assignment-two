import { promises as fs } from "fs";
import { randomBytes } from "crypto";
import path from "path";

const SUBMISSIONS_PATH = path.join(
  process.cwd(),
  "data",
  "contact-submissions.json"
);

const EMAIL_PATTERN =
  /^[A-Za-z0-9]+([._%+-][A-Za-z0-9]+)*@[A-Za-z0-9]+(-[A-Za-z0-9]+)*(\.[A-Za-z0-9]+(-[A-Za-z0-9]+)*)*\.[A-Za-z]{2,}$/;
const MAX_LENGTHS = { name: 200, email: 320, message: 5000 };

let writeQueue = Promise.resolve();

function serializeWrite(task) {
  const result = writeQueue.then(task);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function renameWithRetry(from, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (error) {
      const transient =
        error.code === "EPERM" ||
        error.code === "EBUSY" ||
        error.code === "EACCES";
      if (!transient || attempt >= 4) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}

async function appendSubmission(fields) {
  let submissions = [];
  try {
    submissions = JSON.parse(await fs.readFile(SUBMISSIONS_PATH, "utf8"));
  } catch (readError) {
    if (readError.code !== "ENOENT") {
      throw readError;
    }
  }
  if (!Array.isArray(submissions)) {
    throw new Error("Submissions file is malformed.");
  }

  const nextId =
    submissions.reduce(
      (max, item) => Math.max(max, Number(item.id) || 0),
      0
    ) + 1;
  const submission = {
    id: nextId,
    name: fields.name,
    email: fields.email,
    message: fields.message,
    submittedAt: new Date().toISOString(),
  };

  submissions.push(submission);

  await fs.mkdir(path.dirname(SUBMISSIONS_PATH), { recursive: true });
  const tempPath = `${SUBMISSIONS_PATH}.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(
    tempPath,
    JSON.stringify(submissions, null, 2) + "\n",
    "utf8"
  );
  await renameWithRetry(tempPath, SUBMISSIONS_PATH);

  return submission;
}

export async function POST(request) {
  let fields;
  try {
    const body = await request.json();
    fields = {
      name: String(body.name ?? "").trim(),
      email: String(body.email ?? "").trim(),
      message: String(body.message ?? "").trim(),
    };
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const errors = {};
  if (!fields.name) {
    errors.name = "Name is required.";
  } else if (fields.name.length > MAX_LENGTHS.name) {
    errors.name = `Name must be at most ${MAX_LENGTHS.name} characters.`;
  }
  if (!fields.email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(fields.email)) {
    errors.email = "Email must be a valid email address.";
  } else if (fields.email.length > MAX_LENGTHS.email) {
    errors.email = `Email must be at most ${MAX_LENGTHS.email} characters.`;
  }
  if (!fields.message) {
    errors.message = "Message is required.";
  } else if (fields.message.length < 10) {
    errors.message = "Message must be at least 10 characters.";
  } else if (fields.message.length > MAX_LENGTHS.message) {
    errors.message = `Message must be at most ${MAX_LENGTHS.message} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  try {
    const submission = await serializeWrite(() => appendSubmission(fields));
    return Response.json({ ok: true, id: submission.id }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Could not save your message. Please try again." },
      { status: 500 }
    );
  }
}
