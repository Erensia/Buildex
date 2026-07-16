import { BuildPlanner } from "@/components/build-planner";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/build-profiles";

export default async function BuildPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?callbackUrl=/build");
  return <BuildPlanner userName={user.displayName} />;
}
