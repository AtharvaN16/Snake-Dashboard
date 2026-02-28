import { NextResponse } from "next/server";
import { deleteSnake, updateSnakeFields, addSnakeManual } from "@/lib/editMode";
import { generateDescription, generateAKA } from "@/lib/snakeGenerator";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const { action, id, data } = await request.json();

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
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[edit-mode] API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
