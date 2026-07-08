/** مسار ملفات public مع مراعاة base في vite.config (مثلاً /react/) */
export function assetUrl(path) {
  const clean = String(path).replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${clean}`;
}
