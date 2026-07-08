/**
 * Seed Firestore collections: roles, permissions, departments.
 * Create first admin: node scripts/seedFirestore.js --admin-email=admin@drivo.com --admin-password=YourSecurePass123
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or server/serviceAccountKey.json
 */
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ?? join(__dirname, "../server/serviceAccountKey.json");

if (!admin.apps.length) {
  if (existsSync(saPath)) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(saPath, "utf8"))) });
  } else {
    admin.initializeApp({ projectId: "drivo-project-6f3fd" });
  }
}

const db = admin.firestore();
const { ALL_PERMISSIONS } = await import("../src/lib/permissions.js");

const ROLES = {
  admin: {
    name: "مدير النظام",
    description: "صلاحيات كاملة",
    permissions: ["*"],
  },
  support: {
    name: "خدمة عملاء",
    description: "إدارة الرحلات والعملاء والدعم",
    permissions: [
      "Dashboard.Read", "Trips.Read", "Trips.Edit",
      "Clients.Read", "Clients.Edit",
      "Support.Read", "Support.Edit",
      "Notifications.Read", "Notifications.Send",
    ],
  },
  accountant: {
    name: "محاسب",
    description: "المالية والمكافآت",
    permissions: ["Dashboard.Read", "Trips.Read", "Rewards.Read", "Rewards.Edit"],
  },
  supervisor: {
    name: "مشرف",
    description: "إشراف تشغيلي",
    permissions: [
      "Dashboard.Read", "Trips.Read", "Trips.Edit",
      "Clients.Read", "Drivers.Read", "Support.Read", "Notifications.Read",
    ],
  },
};

const DEPARTMENTS = [
  { name: "خدمة العملاء", code: "support" },
  { name: "المالية", code: "finance" },
  { name: "العمليات", code: "operations" },
  { name: "تقنية المعلومات", code: "it" },
];

async function seedRoles() {
  for (const [id, data] of Object.entries(ROLES)) {
    await db.collection("roles").doc(id).set(data, { merge: true });
    console.log("role:", id);
  }
}

async function seedPermissions() {
  for (const key of ALL_PERMISSIONS) {
    const module = key.split(".")[0];
    const action = key.split(".")[1];
    await db.collection("permissions").doc(key.replace(/\./g, "_")).set({
      key,
      module,
      action,
      name: key,
    }, { merge: true });
  }
  console.log("permissions:", ALL_PERMISSIONS.length);
}

async function seedDepartments() {
  for (const dept of DEPARTMENTS) {
    await db.collection("departments").doc(dept.code).set(dept, { merge: true });
  }
  console.log("departments:", DEPARTMENTS.length);
}

async function createAdmin(email, password, fullName = "مدير النظام") {
  let uid;
  try {
    const existing = await admin.auth().getUserByEmail(email);
    uid = existing.uid;
    console.log("admin auth exists:", email);
  } catch {
    const user = await admin.auth().createUser({ email, password, displayName: fullName });
    uid = user.uid;
    console.log("admin auth created:", email);
  }

  await admin.auth().setCustomUserClaims(uid, { role: "admin", permissions: ["*"] });

  await db.collection("users").doc(uid).set({
    uid,
    email,
    fullName,
    phone: "",
    department: "تقنية المعلومات",
    role: "admin",
    permissions: ["*"],
    status: "active",
    avatar: "",
    createdBy: "system",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: null,
    firstLogin: false,
    passwordChangedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log("admin profile ready:", uid);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

await seedRoles();
await seedPermissions();
await seedDepartments();

if (args["admin-email"] && args["admin-password"]) {
  await createAdmin(args["admin-email"], args["admin-password"], args["admin-name"] ?? "مدير النظام");
}

console.log("Seed complete.");
process.exit(0);
