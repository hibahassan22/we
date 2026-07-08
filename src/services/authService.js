import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/auth.js";
import { db } from "../firebase/firestore.js";
import { getAuthErrorMessage, STATUS_MESSAGES } from "../lib/authErrors.js";
import { logActivity } from "./activityService.js";

const ACTIVE_STATUSES = new Set(["active"]);

export async function loginWithEmail(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    await credential.user.getIdToken(true);
    const profile = await fetchUserProfile(credential.user.uid);

    if (!profile) {
      await firebaseSignOut(auth);
      throw {
        code: "auth/profile-not-found",
        message: "حسابك غير مكتمل في النظام. تواصل مع مدير النظام لإكمال إعداد الحساب",
      };
    }

    if (!ACTIVE_STATUSES.has(profile.status)) {
      await firebaseSignOut(auth);
      const msg = STATUS_MESSAGES[profile.status] ?? "حسابك غير مفعّل";
      throw { code: "auth/user-disabled", message: msg };
    }

    await updateDoc(doc(db, "users", credential.user.uid), {
      lastLogin: serverTimestamp(),
      ...(profile.firstLogin ? { firstLogin: false } : {}),
    }).catch(() => {});

    await logActivity({
      action: "login",
      performedBy: credential.user.uid,
      targetUser: credential.user.uid,
    }).catch(() => {});

    return { user: credential.user, profile };
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function logout() {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await logActivity({
      action: "logout",
      performedBy: uid,
      targetUser: uid,
    }).catch(() => {});
  }
  await firebaseSignOut(auth);
}

export async function sendResetEmail(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("يجب تسجيل الدخول أولاً");

  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);

    await updateDoc(doc(db, "users", user.uid), {
      firstLogin: false,
      passwordChangedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logActivity({
      action: "password_changed",
      performedBy: user.uid,
      targetUser: user.uid,
    });
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

export async function getIdToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
