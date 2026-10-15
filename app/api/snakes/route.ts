import { NextResponse } from "next/server";
import { getAllSnakesMerged } from "@/lib/snakeDataServer";

export async function GET() {
  try {
    const snakes = getAllSnakesMerged();
    return NextResponse.json(snakes);
  } catch (error) {
    console.error("[API snakes] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
