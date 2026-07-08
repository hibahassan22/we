import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.ADMIN_API_PORT ?? 3001;

let adminSdkReady = false;
let adminSdkError = null;

function initFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ?? join(__dirname, "serviceAccountKey.json");

  if (existsSync(saPath)) {
    const serviceAccount = JSON.parse(readFileSync(saPath, "utf8"));
    adminSdkReady = true;
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  adminSdkReady = false;
  adminSdkError =
    "ملف serviceAccountKey.json غير موجود. حمّله من Firebase Console وضعه في مجلد server/";

  // Fallback init — Auth/Firestore calls will fail until credentials are added.
  return admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID ?? "drivo-project-6f3fd",
  });
}

initFirebaseAdmin();
const db = admin.firestore();
const authAdmin = admin.auth();

const VALID_STATUSES = new Set(["active", "inactive", "suspended", "blocked", "disabled"]);

async function roleExists(roleId) {
  if (!roleId || typeof roleId !== "string") return false;
  const snap = await db.collection("roles").doc(roleId).get();
  return snap.exists;
}

async function assertValidRole(roleId, res) {
  if (!roleId) {
    res.status(400).json({ message: "الدور مطلوب" });
    return false;
  }
  if (!(await roleExists(roleId))) {
    res.status(400).json({ message: `الدور «${roleId}» غير موجود — أنشئه من صفحة الصلاحيات أولاً` });
    return false;
  }
  return true;
}

async function verifyAdmin(req, res, next) {
  try {
    if (!adminSdkReady) {
      return res.status(503).json({
        code: "ADMIN_SDK_NOT_CONFIGURED",
        message: adminSdkError,
      });
    }

    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول" });

    const decoded = await authAdmin.verifyIdToken(token);
    const profileSnap = await db.collection("users").doc(decoded.uid).get();
    const profile = profileSnap.data();
    const claimRole = decoded.role ?? null;
    const isAdmin = claimRole === "admin" || profile?.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({ code: "PERMISSION_DENIED", message: "صلاحيات المدير مطلوبة" });
    }

    req.adminUid = decoded.uid;
    req.adminProfile = profile ?? { uid: decoded.uid, role: claimRole ?? "admin" };
    next();
  } catch (err) {
    console.error("[verifyAdmin]", err);
    return res.status(401).json({ code: "UNAUTHORIZED", message: "جلسة غير صالحة" });
  }
}

function mapAdminError(err) {
  const msg = err?.message ?? "";
  if (err?.code === "auth/invalid-credential" || msg.includes("Could not load the default credentials")) {
    return {
      status: 503,
      code: "ADMIN_SDK_NOT_CONFIGURED",
      message: adminSdkError ?? "خادم Firebase Admin غير مهيأ. أضف serviceAccountKey.json",
    };
  }
  return {
    status: 500,
    code: err?.code ?? "SERVER_ERROR",
    message: msg || "خطأ في الخادم",
  };
}

async function writeActivity(action, performedBy, targetUser, extra = {}) {
  await db.collection("activityLogs").add({
    action,
    performedBy,
    targetUser,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    device: extra.device ?? "server",
    ip: extra.ip ?? null,
    ...extra,
  });
}

async function writeNotification({ title, body, createdBy, type = "user" }) {
  await db.collection("notifications").add({
    title,
    body,
    type,
    createdBy,
    read: false,
    deliveryStatus: "sent",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, adminSdk: adminSdkReady }));

/** POST /api/admin/create-user */
app.post("/api/admin/create-user", verifyAdmin, async (req, res) => {
  try {
    const {
      fullName, email, password, phone = "", department = "",
      role = "support", permissions = [], status = "active",
    } = req.body ?? {};

    if (!fullName?.trim()) return res.status(400).json({ message: "الاسم الكامل مطلوب" });
    if (!validateEmail(email)) return res.status(400).json({ code: "INVALID_EMAIL", message: "بريد غير صالح" });
    if (!password || password.length < 8) {
      return res.status(400).json({ code: "WEAK_PASSWORD", message: "كلمة المرور ضعيفة" });
    }
    if (!(await assertValidRole(role, res))) return;
    if (!VALID_STATUSES.has(status)) return res.status(400).json({ code: "INVALID_STATUS", message: "حالة غير صالحة" });

    let userRecord;
    try {
      userRecord = await authAdmin.createUser({
        email: email.trim().toLowerCase(),
        password,
        displayName: fullName.trim(),
        disabled: status !== "active",
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        return res.status(409).json({ code: "DUPLICATE_EMAIL", message: "البريد مسجل مسبقاً" });
      }
      throw err;
    }

    const uid = userRecord.uid;
    const now = admin.firestore.FieldValue.serverTimestamp();

    await authAdmin.setCustomUserClaims(uid, { role, permissions: role === "admin" ? ["*"] : [] });

    const userDoc = {
      uid,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      phone: phone.trim(),
      department: department.trim(),
      role,
      permissions: role === "admin" ? ["*"] : [],
      status,
      avatar: "",
      createdBy: req.adminUid,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
      firstLogin: false,
      passwordChangedAt: null,
    };

    await db.collection("users").doc(uid).set(userDoc);

    await writeActivity("create_user", req.adminUid, uid, { role, status });
    await writeNotification({
      title: "مستخدم جديد",
      body: `${fullName.trim()} — ${role}`,
      createdBy: req.adminUid,
    });

    return res.status(201).json({ uid, user: userDoc });
  } catch (err) {
    console.error("[create-user]", err);
    const mapped = mapAdminError(err);
    return res.status(mapped.status).json({ code: mapped.code, message: mapped.message });
  }
});

/** PUT /api/admin/users/:uid */
app.put("/api/admin/users/:uid", verifyAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { fullName, phone, department, role, permissions, status } = req.body ?? {};

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ code: "USER_NOT_FOUND", message: "المستخدم غير موجود" });

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (department !== undefined) updates.department = department.trim();
    if (role !== undefined) {
      if (!(await assertValidRole(role, res))) return;
      updates.role = role;
      updates.permissions = role === "admin" ? ["*"] : [];
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.has(status)) return res.status(400).json({ code: "INVALID_STATUS" });
      updates.status = status;
      await authAdmin.updateUser(uid, { disabled: status !== "active" });
    }

    if (fullName) await authAdmin.updateUser(uid, { displayName: fullName.trim() });

    const finalRole = updates.role ?? snap.data().role;
    const finalPerms = finalRole === "admin" ? ["*"] : [];
    await authAdmin.setCustomUserClaims(uid, { role: finalRole, permissions: finalPerms });

    await ref.update(updates);
    await writeActivity("update_user", req.adminUid, uid, updates);
    await writeNotification({
      title: "تحديث مستخدم",
      body: updates.fullName ?? snap.data().fullName,
      createdBy: req.adminUid,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[update-user]", err);
    return res.status(500).json({ message: err.message });
  }
});

/** DELETE /api/admin/users/:uid */
app.delete("/api/admin/users/:uid", verifyAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    if (uid === req.adminUid) {
      return res.status(400).json({ message: "لا يمكن حذف حسابك" });
    }

    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ code: "USER_NOT_FOUND" });

    await authAdmin.deleteUser(uid);
    await db.collection("users").doc(uid).delete();
    await writeActivity("delete_user", req.adminUid, uid);
    await writeNotification({
      title: "حذف مستخدم",
      body: snap.data().fullName ?? uid,
      createdBy: req.adminUid,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[delete-user]", err);
    return res.status(500).json({ message: err.message });
  }
});

/** POST /api/admin/users/:uid/status */
app.post("/api/admin/users/:uid/status", verifyAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { status } = req.body ?? {};
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ code: "INVALID_STATUS", message: "حالة غير صالحة" });
    }

    await db.collection("users").doc(uid).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await authAdmin.updateUser(uid, { disabled: status !== "active" });

    await writeActivity("status_changed", req.adminUid, uid, { status });
    await writeNotification({
      title: status === "active" ? "تفعيل مستخدم" : "تعليق مستخدم",
      body: uid,
      createdBy: req.adminUid,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[status]", err);
    return res.status(500).json({ message: err.message });
  }
});

/** POST /api/admin/users/:uid/reset-password */
app.post("/api/admin/users/:uid/reset-password", verifyAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await authAdmin.getUser(uid);
    if (!user.email) return res.status(400).json({ message: "لا يوجد بريد للمستخدم" });

    const link = await authAdmin.generatePasswordResetLink(user.email);
    await writeActivity("password_reset", req.adminUid, uid);

    return res.json({ ok: true, resetLink: link });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ message: err.message });
  }
});

/** POST /api/admin/users/sync-role-by-email — ربط دور الموظف بحساب Firebase بنفس البريد */
app.post("/api/admin/users/sync-role-by-email", verifyAdmin, async (req, res) => {
  try {
    const { email, role } = req.body ?? {};
    const normalized = String(email ?? "").trim().toLowerCase();
    if (!validateEmail(normalized)) {
      return res.status(400).json({ message: "بريد غير صالح" });
    }
    if (!(await assertValidRole(role, res))) return;

    let authUser;
    try {
      authUser = await authAdmin.getUserByEmail(normalized);
    } catch {
      return res.status(404).json({ code: "USER_NOT_FOUND", message: "لا يوجد حساب Firebase بهذا البريد" });
    }

    const uid = authUser.uid;
    const perms = role === "admin" ? ["*"] : [];
    await authAdmin.setCustomUserClaims(uid, { role, permissions: perms });
    await db.collection("users").doc(uid).set(
      { role, permissions: perms, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    await writeActivity("sync_role_by_email", req.adminUid, uid, { role, email: normalized });
    return res.json({ ok: true, uid });
  } catch (err) {
    console.error("[sync-role-by-email]", err);
    return res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[admin-api] http://localhost:${PORT}`);
  if (!adminSdkReady) {
    console.warn("[admin-api] ⚠️  " + adminSdkError);
    console.warn("[admin-api] ⚠️  إنشاء المستخدمين لن يعمل حتى إضافة الملف.");
  }
});

export default app;
