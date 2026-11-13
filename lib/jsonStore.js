import { promises as fs } from "fs";
import { randomBytes } from "crypto";
import path from "path";

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

async function readJsonArray(filePath) {
  try {
    const items = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (!Array.isArray(items)) {
      throw new Error(`${path.basename(filePath)} is malformed.`);
    }
    return items;
  } catch (readError) {
    if (readError.code !== "ENOENT") {
      throw readError;
    }
    return [];
  }
}

async function writeJsonArrayAtomic(filePath, items) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(items, null, 2) + "\n", "utf8");
  await renameWithRetry(tempPath, filePath);
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

export { nextId, readJsonArray, serializeWrite, writeJsonArrayAtomic };
