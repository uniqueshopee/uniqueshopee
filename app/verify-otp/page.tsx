import type { Metadata } from "next";
import { VerifyOtpAuthPage } from "@/components/auth/verify-otp-auth-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Verify OTP | UniqueShopee",
    description: "Verify the one-time password sent to your contact using a premium, mobile-first flow.",
  };
}

export default function VerifyOtpRoute() {
  return <VerifyOtpAuthPage />;
}
