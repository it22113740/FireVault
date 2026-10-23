import { z } from "zod";
import type { Enums, Tables } from "@/lib/database.types";

export type PaymentMethod = Enums<"topup_payment_method">;

// Labels for the Buy dialog, the order alert and /admin/orders. `proof` is
// what the buyer uploads for that method.
export const PAYMENT_METHODS: { value: PaymentMethod; label: string; proof: string; proofHint: string }[] = [
  {
    value: "bank",
    label: "Bank transfer",
    proof: "Bank payment slip",
    proofHint: "A photo of the bank payment slip, or a screenshot of the online transfer.",
  },
  {
    value: "ezcash",
    label: "eZ Cash",
    proof: "eZ Cash transfer screenshot",
    proofHint: "A screenshot of the eZ Cash transfer confirmation.",
  },
  {
    value: "binance",
    label: "Binance",
    proof: "Binance transfer screenshot",
    proofHint: "A screenshot of the successful Binance transfer.",
  },
];

export function paymentMethodLabel(method: PaymentMethod) {
  return PAYMENT_METHODS.find((option) => option.value === method)!.label;
}

// In this order in the Buy dialog and Settings; the first is shown by default
export const EZCASH_LANGUAGES = [
  { value: "ta", label: "தமிழ்" },
  { value: "en", label: "English" },
  { value: "si", label: "සිංහල" },
] as const;
export type EzCashLanguage = (typeof EZCASH_LANGUAGES)[number]["value"];

export const MAX_BANK_ACCOUNTS = 10;

export const bankAccountSchema = z.object({
  accountName: z.string().trim().min(1, "Enter the account name").max(100, "Keep it under 100 characters"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9][0-9 -]{0,29}$/, "Use digits only (spaces and dashes are fine)"),
  bankName: z.string().trim().min(1, "Enter the bank").max(100, "Keep it under 100 characters"),
  branch: z.string().trim().min(1, "Enter the branch").max(100, "Keep it under 100 characters"),
});
export type BankAccount = z.output<typeof bankAccountSchema>;

// What the Buy dialog offers. A method is null (or an empty bank list) when the
// super admin hasn't set it up in Settings.
export type PaymentOptions = {
  bank: BankAccount[];
  ezcash: { number: string; messages: Record<EzCashLanguage, string> } | null;
  binance: { payId: string; name: string } | null;
};

export function getPaymentOptions(settings: Tables<"app_settings">): PaymentOptions {
  const banks = z.array(bankAccountSchema).safeParse(settings.bank_accounts);
  return {
    bank: banks.success ? banks.data : [],
    ezcash: settings.ezcash_number
      ? {
          number: settings.ezcash_number,
          messages: { en: settings.ezcash_message_en, si: settings.ezcash_message_si, ta: settings.ezcash_message_ta },
        }
      : null,
    binance: settings.binance_pay_id ? { payId: settings.binance_pay_id, name: settings.binance_name } : null,
  };
}

export function availablePaymentMethods(options: PaymentOptions): PaymentMethod[] {
  return PAYMENT_METHODS.map((option) => option.value).filter((method) =>
    method === "bank" ? options.bank.length > 0 : options[method] !== null
  );
}
