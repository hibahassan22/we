import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const SearchContext = createContext(null);

const SEARCH_PLACEHOLDERS = {
  "/dashboard": "ابحث في لوحة التحكم...",
  "/trips": "ابحث عن رحلة، سائق، أو عميل...",
  "/create-trip": "ابحث عن رحلة معروضة...",
  "/new-trip": "ابحث عن موقع...",
  "/clients": "ابحث عن عميل بالاسم أو الهاتف...",
  "/drivers": "ابحث عن سائق بالاسم أو الهاتف...",
  "/rewards": "ابحث عن كود مكافأة...",
  "/support": "ابحث في التذاكر أو المحادثات...",
  "/notifications": "ابحث بالعنوان أو المحتوى...",
  "/activity": "ابحث في سجل النشاطات...",
  "/approvals": "ابحث برقم الطلب أو الرحلة...",
  "/permissions": "ابحث عن دور...",
  "/users": "ابحث بالاسم أو البريد...",
  "/system": "ابحث في إعدادات النظام...",
  "/accounts": "ابحث في الحسابات...",
  "/settings": "ابحث في الإعدادات...",
};

export function getSearchPlaceholder(pathname) {
  if (SEARCH_PLACEHOLDERS[pathname]) return SEARCH_PLACEHOLDERS[pathname];
  const match = Object.keys(SEARCH_PLACEHOLDERS).find(
    (route) => route !== "/dashboard" && pathname.startsWith(route)
  );
  return match ? SEARCH_PLACEHOLDERS[match] : "ابحث هنا...";
}

export function SearchProvider({ children }) {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();

  useEffect(() => {
    setSearchQuery("");
  }, [location.pathname]);

  const value = useMemo(
    () => ({ searchQuery, setSearchQuery }),
    [searchQuery]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    return { searchQuery: "", setSearchQuery: () => {} };
  }
  return ctx;
}
