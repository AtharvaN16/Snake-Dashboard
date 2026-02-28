import { NextResponse } from "next/server";
import { deleteSnake, updateSnakeFields, addSnakeManual } from "@/lib/editMode";
import { generateDescription, generateAKA, generateMisidentificationRisk } from "@/lib/snakeGenerator";
import { generateRangeMap } from "@/lib/rangeGenerator";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, id, data } = body;
    console.log(`[API edit-mode] Action: ${action}, ID: ${id}`);

    switch (action) {
      case "delete":
        await deleteSnake(id);
        return NextResponse.json({ success: true });
      case "updateFields":
        await updateSnakeFields(id, data);
        return NextResponse.json({ success: true });
      case "add":
        await addSnakeManual(data);
        return NextResponse.json({ success: true });
      case "generateDescription":
        const desc = await generateDescription(id);
        return NextResponse.json({ success: true, description: desc });
      case "generateAKA":
        const aka = await generateAKA(id);
        return NextResponse.json({ success: true, otherCommonNames: aka });
      case "generateMisidentificationRisk":
        const riskData = await generateMisidentificationRisk(id);
        return NextResponse.json({ success: true, ...riskData });
      case "generateRangeMap":
        const rangeResult = await generateRangeMap(id);
        return NextResponse.json(rangeResult);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[edit-mode] API Error Details:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
