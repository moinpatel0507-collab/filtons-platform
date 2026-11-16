"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.rpc("log_event", { p_action: "sign_out" });
  await supabase.auth.signOut();
  redirect("/login?msg=signed-out");
}
