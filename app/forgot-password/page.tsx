import type { Metadata } from "next";
import { ForgotPasswordAuthPage } from "@/components/auth/forgot-password-auth-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Forgot Password | UniqueShopee",
    description: "Request a reset OTP for your UniqueShopee account using a clean, premium recovery form.",
  };
}

export default function ForgotPasswordRoute() {
  return <ForgotPasswordAuthPage />;
}
