import { redirect } from "next/navigation";
import { AdminDataManager } from "@/components/admin-data-manager";
import { getCurrentAdmin } from "@/lib/admin";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/signin?callbackUrl=/admin");
  return <AdminDataManager adminName={admin.displayName} />;
}
