import type { Metadata } from "next";
import { RoomVisualizerPage } from "@/components/tools/room-visualizer-kit";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Room Visualizer | UniqueShopee",
    description: "Preview paint colours on your room photo with a premium before-and-after visualizer.",
  };
}

export default function RoomVisualizerRoute() {
  return (
    <main>
      <RoomVisualizerPage />
    </main>
  );
}
