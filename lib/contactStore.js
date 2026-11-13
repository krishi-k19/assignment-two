import path from "path";
import { nextId, readJsonArray, writeJsonArrayAtomic } from "./jsonStore";

export const CONTACT_SUBMISSIONS_PATH = path.join(
  process.cwd(),
  "data",
  "contact-submissions.json"
);

function isValidContactEmail(value) {
  if (/\s/.test(value)) {
    return false;
  }
  const parts = value.split("@");
  if (parts.length !== 2) {
    return false;
  }
  const [local, domain] = parts;
  if (!local) {
    return false;
  }
  const labels = domain.split(".");
  if (labels.length < 2) {
    return false;
  }
  return labels.every((label) => label.length > 0);
}

function validateTextField(raw, label, errors) {
  if (raw === undefined || raw === null) {
    errors[label.toLowerCase()] = `${label} is required.`;
    return "";
  }
  if (typeof raw !== "string") {
    errors[label.toLowerCase()] = `${label} must be a string.`;
    return "";
  }
  const value = raw.trim();
  if (!value) {
    errors[label.toLowerCase()] = `${label} is required.`;
    return "";
  }
  return value;
}

function validateContactBody(body) {
  const errors = {};
  const name = validateTextField(body.name, "Name", errors);
  let email = "";
  if (body.email === undefined || body.email === null) {
    errors.email = "Email is required.";
  } else if (typeof body.email !== "string") {
    errors.email = "Email must be a string.";
  } else if (body.email.trim() === "") {
    errors.email = "Email is required.";
  } else if (!isValidContactEmail(body.email)) {
    errors.email = "Email must be a valid email address.";
  } else {
    email = body.email;
  }
  const message = validateTextField(body.message, "Message", errors);
  return { errors, fields: { name, email, message } };
}

async function appendContactSubmission(fields) {
  const submissions = await readJsonArray(CONTACT_SUBMISSIONS_PATH);
  const submission = {
    id: nextId(submissions),
    name: fields.name,
    email: fields.email,
    message: fields.message,
    submittedAt: new Date().toISOString(),
  };
  submissions.push(submission);
  await writeJsonArrayAtomic(CONTACT_SUBMISSIONS_PATH, submissions);
  return submission;
}

export { appendContactSubmission, validateContactBody };
