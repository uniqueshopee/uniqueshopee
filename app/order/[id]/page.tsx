import { redirect } from "next/navigation";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function OrderDetailRoute({ params }: OrderPageProps) {
  const { id } = await params;
  redirect(`/orders/${id}`);
}
