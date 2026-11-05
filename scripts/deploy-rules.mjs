// Deploys firestore.rules using the Firebase Admin credentials in .env (no Firebase CLI needed).
//   node scripts/deploy-rules.mjs
import { readFileSync, existsSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail } = process.env;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
  console.error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (in .env or the environment).");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
const source = readFileSync("firestore.rules", "utf8");
const ruleset = await getSecurityRules().releaseFirestoreRulesetFromSource(source);
console.log(`Deployed firestore.rules to ${projectId} (ruleset ${ruleset.name.split("/").pop()})`);
