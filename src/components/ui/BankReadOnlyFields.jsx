export default function BankReadOnlyFields({ bank, loading, inputClass, readOnlyInputClass }) {
  const fieldClass = readOnlyInputClass || `${inputClass} bg-gray-50 text-gray-600 cursor-not-allowed`;

  if (loading) {
    return <p className="text-xs text-gray-400 text-right">جاري تحميل بيانات البنك...</p>;
  }

  if (!bank) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-right">
        لا توجد بنوك — أضفها من إدارة النظام
      </p>
    );
  }

  const rows = [
    { label: "اسم البنك", value: bank.bank_name || bank.name || "—" },
    { label: "اسم الحساب", value: bank.account_name || "—" },
    { label: "رقم الحساب", value: bank.account_number || bank.bank_number || "—", dir: "ltr" },
    { label: "الآيبان", value: bank.iban || "—", dir: "ltr" },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <label className="text-xs text-gray-500 block text-right">{row.label}</label>
          <input
            type="text"
            value={row.value}
            readOnly
            dir={row.dir}
            className={fieldClass}
          />
        </div>
      ))}
    </div>
  );
}
