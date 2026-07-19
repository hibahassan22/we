const API_BASE = "https://drivo1.elmoroj.com/api";

function asList(json) {
  if (Array.isArray(json?.cities)) return json.cities;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

export function getCityName(city) {
  return String(city?.name ?? city?.city_name ?? city?.title ?? "").trim();
}

/** GET /api/cities — مدن إدارة النظام */
export async function fetchCities(signal) {
  const res = await fetch(`${API_BASE}/cities`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`فشل تحميل المدن (${res.status})`);
  const json = await res.json();
  return asList(json)
    .map((c) => ({
      id: c.id ?? getCityName(c),
      name: getCityName(c),
    }))
    .filter((c) => c.name);
}

/** جنسيات شائعة للاختيار */
export const NATIONALITY_OPTIONS = [
  "سعودي",
  "مصري",
  "يمني",
  "سوري",
  "أردني",
  "فلسطيني",
  "سوداني",
  "هندي",
  "باكستاني",
  "فلبيني",
  "بنغلاديشي",
  "نيبالي",
  "غير سعودي",
];
