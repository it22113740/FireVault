import "server-only";
import { hasActiveAccess } from "@/lib/sales-admin-access";
import { createClient } from "@/lib/supabase/server";

export type SellerOption = { id: string; name: string; active: boolean };

// Shops a super admin can file a listing under (listing form "Seller" picker)
export async function getSellerOptions(): Promise<SellerOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("id, display_name, profile:profiles!seller_profiles_id_fkey(role, is_active, active_until)")
    .order("display_name");
  if (error) throw new Error(`Failed to load sellers: ${error.message}`);
  return (data ?? []).map((shop) => ({
    id: shop.id,
    name: shop.display_name,
    active: !!shop.profile && hasActiveAccess(shop.profile),
  }));
}
