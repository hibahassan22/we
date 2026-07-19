const STORAGE_KEY = "drivo_driver_banking";

function readStoredDrivers() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function normalizeStatus(value, balance) {
  const status = String(value ?? "").trim().toLowerCase();
  if (["غير مؤهل", "مديون", "debtor", "indebted"].includes(status)) return "غير مؤهل";
  if (["مؤهل", "متاح", "available", "clear"].includes(status)) return "مؤهل";
  return Number(balance) > 0 ? "غير مؤهل" : "مؤهل";
}

function createMockBankingData(driver) {
  const key = String(driver?.id ?? driver?.phone ?? driver?.name ?? "driver");
  let seed = 0;
  for (let i = 0; i < key.length; i += 1) {
    seed = ((seed << 5) - seed + key.charCodeAt(i)) | 0;
  }
  const randomValue = Math.abs(Math.imul(seed || 1, 2654435761));
  const isDebtor = randomValue % 2 === 0;
  return {
    balance: isDebtor ? ((randomValue % 48) + 3) * 100 : 0,
    bankingStatus: isDebtor ? "غير مؤهل" : "مؤهل",
    isDebtor,
  };
}

export function getDriverBankingData(driver) {
  const id = driver?.id != null ? String(driver.id) : "";
  const stored = id ? readStoredDrivers()[id] : null;
  const apiBalance =
    driver?.balance ?? driver?.bank_balance ?? driver?.wallet_balance ?? null;
  const apiStatus =
    driver?.banking_status ?? driver?.bank_status ?? driver?.financial_status ?? null;

  if (stored || apiBalance != null || apiStatus != null) {
    const rawBalance = stored?.balance ?? apiBalance ?? 0;
    const balance = Math.max(0, Number(rawBalance) || 0);
    const bankingStatus = normalizeStatus(
      stored?.bankingStatus ?? apiStatus,
      balance,
    );
    return {
      balance,
      bankingStatus,
      isDebtor: bankingStatus === "غير مؤهل",
    };
  }

  return createMockBankingData(driver);
}

export function saveDriverBankingData(driverId, data) {
  if (typeof window === "undefined" || driverId == null || driverId === "") return;
  try {
    const stored = readStoredDrivers();
    const balance = Math.max(0, Number(data?.balance) || 0);
    const bankingStatus = normalizeStatus(data?.bankingStatus, balance);
    stored[String(driverId)] = { balance, bankingStatus };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // التخزين مؤقت لحين دعم البيانات من الـ API.
  }
}
