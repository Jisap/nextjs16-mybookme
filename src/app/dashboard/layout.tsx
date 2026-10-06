import { createClient } from "@/lib/supabase/server";
import { TopBar } from "./top-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <div className="min-h-screen">
      <TopBar email={data.user?.email ?? null} />
      {children}
    </div>
  );
}
