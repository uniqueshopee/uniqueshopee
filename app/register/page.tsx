import type { Metadata } from "next";
import { RegisterAuthPage } from "@/components/auth/register-auth-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Register | UniqueShopee",
    description: "Create a premium UniqueShopee account and get ready for future OTP and social auth flows.",
  };
}

export default function RegisterRoute() {
  return <RegisterAuthPage />;
}
