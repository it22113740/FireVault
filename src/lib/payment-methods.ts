// TODO: replace the placeholder details below with your real payment accounts
// before going live. Buyers send money to exactly what is shown here.
export const PAYMENT_METHODS = {
  bank_transfer: {
    label: "Bank transfer",
    details: [
      { label: "Bank", value: "Your Bank PLC" },
      { label: "Branch", value: "Your Branch" },
      { label: "Account name", value: "Your Name" },
      { label: "Account number", value: "0000000000", copy: true },
    ],
  },
  ez_cash: {
    label: "eZ Cash",
    details: [
      { label: "eZ Cash number", value: "07X XXX XXXX", copy: true },
      { label: "Name", value: "Your Name" },
    ],
  },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export const PAYMENT_METHOD_IDS = Object.keys(PAYMENT_METHODS) as [
  PaymentMethod,
  ...PaymentMethod[],
];

export function paymentMethodLabel(method: string) {
  return method in PAYMENT_METHODS
    ? PAYMENT_METHODS[method as PaymentMethod].label
    : method;
}
