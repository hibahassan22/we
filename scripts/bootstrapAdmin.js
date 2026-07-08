/**
 * Grant admin role (custom claims + Firestore profile) to existing Firebase Auth users.
 *
 * Single user:  node scripts/bootstrapAdmin.js --email=you@example.com
 * All without profile: node scripts/bootstrapAdmin.js --all
 */
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ?? join(__dirname, "../server/serviceAccountKey.json");

if (!existsSync(saPath)) {
  console.error("Missing server/serviceAccountKey.json");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(readFileSync(saPath, "utf8"))),
  });
}

const db = admin.firestore();
const authAdmin = admin.auth();

async function bootstrapUser(user) {
  const uid = user.uid;
  const email = user.email ?? "";
  const fullName = user.displayName ?? email.split("@")[0] ?? "مدير النظام";
  const snap = await db.collection("users").doc(uid).get();

  await authAdmin.setCustomUserClaims(uid, { role: "admin", permissions: ["*"] });

  await db.collection("users").doc(uid).set(
    {
      uid,
      email,
      fullName,
      phone: "",
      department: "تقنية المعلومات",
      role: "admin",
      permissions: ["*"],
      status: "active",
      avatar: "",
      createdBy: "bootstrap",
      createdAt: snap.exists ? snap.data().createdAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: snap.data()?.lastLogin ?? null,
      firstLogin: snap.data()?.firstLogin ?? false,
      passwordChangedAt: snap.data()?.passwordChangedAt ?? admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("admin ready:", email, uid);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

if (args.all) {
  let nextPageToken;
  do {
    const result = await authAdmin.listUsers(1000, nextPageToken);
    for (const user of result.users) {
      const snap = await db.collection("users").doc(user.uid).get();
      if (!snap.exists || snap.data()?.role !== "admin") {
        await bootstrapUser(user);
      }
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);
} else if (args.email) {
  const user = await authAdmin.getUserByEmail(args.email);
  await bootstrapUser(user);
} else {
  console.error("Usage: --email=user@domain.com  OR  --all");
  process.exit(1);
}

console.log("Bootstrap complete. Sign out and sign in again to refresh token.");
process.exit(0);
