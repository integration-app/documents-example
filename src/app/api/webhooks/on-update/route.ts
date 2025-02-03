import { NextResponse } from "next/server";
// import { z } from "zod";


// const WebhookPayloadSchema = z.object({
//   source: z.string(),
//   id: z.string(),
// });

export async function POST(request: Request) {
  try {
    const body = await request.json();


    console.log("Webhook received:", body);

    return NextResponse.json({ message: "ok" });
  } catch (error) {
    console.error("Error in on-delete webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
