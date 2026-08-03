import type { Metadata } from "next";
import { LoginAuthPage } from "@/components/auth/login-auth-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Login | UniqueShopee",
    description: "Sign in to UniqueShopee to continue shopping with a secure, premium authentication flow.",
  };
}

export default function LoginRoute() {
  return <LoginAuthPage />;
}
