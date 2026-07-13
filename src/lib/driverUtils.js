/** رقم حساب السائق — يفضّل bank_account_number ثم الآيبان */
export function getDriverBankAccount(driver) {
  return driver?.bank_account_number || driver?.iban || driver?.account_number || "";
}
