import { getSnakeSummaries } from "@/lib/snakeData";
import { HomeClient } from "@/components/HomeClient";

export default function Home() {
  const snakes = getSnakeSummaries();
  return <HomeClient snakes={snakes} />;
}
