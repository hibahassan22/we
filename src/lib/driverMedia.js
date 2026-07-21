export const MEDIA_HOST = "https://drivo1.elmoroj.com";

export const DRIVER_IMAGE_FIELDS = [
  ["صورة الهوية", "identity_image"],
  ["الهوية (الوجه الأمامي)", "id_front_image"],
  ["رخصة القيادة", "license_image"],
  ["استمارة السيارة", "registration_image"],
  ["صورة السيارة", "car_image"],
  ["السيارة (أمام)", "car_front_image"],
  ["السيارة (خلف)", "car_back_image"],
  ["السيارة (يمين)", "car_right_side_image"],
  ["السيارة (يسار)", "car_left_side_image"],
  ["صورة الرخصة", "driving_license_image"],
];

export function normalizeMediaUrl(url) {
  if (url == null || url === "") return "";
  const s = String(url).trim().replace(/\\/g, "/");
  if (!s) return "";
  if (/^data:/i.test(s) || /^blob:/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) {
    return s
      .replace(/^https?:\/\/drivo\.elmoroj\.com/i, MEDIA_HOST)
      .replace(/^https?:\/\/www\.drivo\.elmoroj\.com/i, MEDIA_HOST);
  }
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${MEDIA_HOST}${s}`;
  if (s.startsWith("storage/")) return `${MEDIA_HOST}/${s}`;
  // مسارات نسبية من الـ API مثل uploads/brokers/xxx.jpg
  return `${MEDIA_HOST}/storage/${s.replace(/^\.\//, "")}`;
}

/** بدائل محتملة لمسار صورة لو الرابط الأساسي فشل */
export function mediaUrlCandidates(url) {
  const raw = String(url ?? "").trim().replace(/\\/g, "/");
  if (!raw) return [];
  if (/^data:/i.test(raw) || /^blob:/i.test(raw)) return [raw];

  const primary = normalizeMediaUrl(raw);
  const candidates = [primary];

  if (!/^https?:\/\//i.test(raw) && !raw.startsWith("//")) {
    const relative = raw.replace(/^\//, "").replace(/^\.\//, "");
    candidates.push(
      `${MEDIA_HOST}/storage/${relative}`,
      `${MEDIA_HOST}/${relative}`,
      `${MEDIA_HOST}/storage/app/public/${relative}`,
      `${MEDIA_HOST}/storage/app/assets/${relative}`,
      `${MEDIA_HOST}/public/${relative}`,
    );
  }

  for (const c of [...candidates]) {
    if (c.startsWith("https://")) candidates.push(c.replace(/^https:/, "http:"));
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function normalizeDriverMedia(driver) {
  if (!driver || typeof driver !== "object") return driver;
  const next = { ...driver };
  DRIVER_IMAGE_FIELDS.forEach(([, key]) => {
    if (next[key]) next[key] = normalizeMediaUrl(next[key]);
  });
  return next;
}

export function getDriverAvatarUrl(driver) {
  if (!driver) return "";
  return (
    normalizeMediaUrl(driver.identity_image)
    || normalizeMediaUrl(driver.id_front_image)
    || normalizeMediaUrl(driver.driving_license_image)
    || normalizeMediaUrl(driver.license_image)
    || normalizeMediaUrl(driver.car_image)
  );
}
