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
  const s = String(url).trim();
  if (!s) return "";
  if (s.startsWith("/")) return `${MEDIA_HOST}${s}`;
  return s.replace(/^https?:\/\/drivo\.elmoroj\.com/i, MEDIA_HOST);
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
