import { randomBytes, scryptSync } from "crypto";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

const N = 16384;
const r = 8;
const p = 1;
const keyLength = 64;

let password = process.argv[2];
if (!password) {
  const rl = createInterface({ input: stdin, output: stdout });
  password = await rl.question("Password to hash: ");
  rl.close();
}
if (!password) {
  console.error("No password provided.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, keyLength, { N, p, r });
console.log(
  `ADMIN_PASSWORD_HASH=scrypt:${N}:${r}:${p}:${salt.toString("hex")}:${hash.toString("hex")}`
);
