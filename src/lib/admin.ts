import { getCurrentUser } from "@/lib/build-profiles";

export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
