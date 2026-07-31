import type { Metadata } from "next";
import { RoomVisualizerPage } from "@/components/tools/room-visualizer-kit";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Room Visualizer | UniqueShopee",
  description: "Preview paint colours on your room photo with a premium before-and-after visualizer.",
  pathname: "/tools/room-visualizer",
});

export default function RoomVisualizerRoute() {
  return (
    <main>
      <RoomVisualizerPage />
    </main>
  );
}
