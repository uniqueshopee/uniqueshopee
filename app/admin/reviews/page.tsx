import type { Metadata } from "next";
import { ReviewsAdminPage } from "@/components/admin/admin-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Reviews Admin | UniqueShopee",
    description: "Moderate product reviews with approve, reject, and delete actions.",
  };
}

export default function AdminReviewsRoute() {
  return <ReviewsAdminPage />;
}
