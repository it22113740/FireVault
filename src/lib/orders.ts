export const ORDER_STATUSES = ["pending", "paid", "delivered", "rejected", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Order = {
  id: string;
  listing_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  payment_method: string;
  payment_slip_url: string | null;
  amount: number;
  status: OrderStatus;
  admin_note: string | null;
  created_at: string;
};

// Mirrors the transitions allowed by set_order_status() in the database
export const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "rejected"],
  paid: ["delivered", "rejected"],
  delivered: [],
  rejected: [],
  refunded: [],
};

export function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
