const BASE = 'https://api.paystack.co';

const paystackFetch = async (path, options = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok || data.status === false) {
    throw new Error(data.message || `Paystack request failed (HTTP ${response.status})`);
  }
  return data.data;
};

// Nigerian banks, cached in memory — this list changes rarely, no need to hit
// Paystack on every page load of the payout-setup form.
let bankListCache = null;
let bankListCachedAt = 0;
const BANK_CACHE_MS = 24 * 60 * 60 * 1000;

const listBanks = async () => {
  const now = Date.now();
  if (bankListCache && now - bankListCachedAt < BANK_CACHE_MS) return bankListCache;
  const banks = await paystackFetch('/bank?country=nigeria&currency=NGN');
  bankListCache = banks.map(b => ({ name: b.name, code: b.code }));
  bankListCachedAt = now;
  return bankListCache;
};

// Confirms an account number actually belongs to a real account at that bank,
// and returns the account holder's name as Paystack has it on file — never trust
// a name typed into a form for this, always resolve it server-side.
const resolveAccount = async (accountNumber, bankCode) => {
  const data = await paystackFetch(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  return { accountName: data.account_name, accountNumber: data.account_number };
};

// percentageCharge is the share that goes to the PLATFORM's main account on every
// split transaction through this subaccount — the remainder goes to the host.
// e.g. percentageCharge: 10 means the platform keeps 10%, host gets 90%.
const createSubaccount = async ({ businessName, bankCode, accountNumber, percentageCharge }) => {
  const data = await paystackFetch('/subaccount', {
    method: 'POST',
    body: JSON.stringify({
      business_name: businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge,
    }),
  });
  return { subaccountCode: data.subaccount_code };
};

const updateSubaccount = async (subaccountCode, { bankCode, accountNumber, percentageCharge }) => {
  const data = await paystackFetch(`/subaccount/${subaccountCode}`, {
    method: 'PUT',
    body: JSON.stringify({
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: percentageCharge,
    }),
  });
  return { subaccountCode: data.subaccount_code };
};

module.exports = { listBanks, resolveAccount, createSubaccount, updateSubaccount };