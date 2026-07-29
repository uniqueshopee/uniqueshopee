import type { Metadata } from "next";
import { ResetPasswordAuthPage } from "@/components/auth/reset-password-auth-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Reset Password | UniqueShopee",
    description: "Set a new UniqueShopee password with a secure, mobile-friendly reset screen.",
  };
}

export default function ResetPasswordRoute() {
  return <ResetPasswordAuthPage />;
}
