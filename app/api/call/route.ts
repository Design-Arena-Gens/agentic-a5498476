import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  callerName: z.string().trim().min(2),
  callerNumber: z.string().trim().optional(),
  recipientName: z.string().trim().min(2),
  recipientNumber: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,14}$/, "Phone numbers must be in E.164 format."),
  objective: z.string().trim().min(5),
  notes: z.string().trim().optional()
});

const buildCallScript = (payload: z.infer<typeof requestSchema>) => {
  const greeting = `Hello ${payload.recipientName}, this is an automated call for you.`;
  const introduction = `${payload.callerName ?? "Agentic Assistant"} asked me to share the following update.`;
  const objective = payload.objective;
  const notes = payload.notes
    ? `Additional context from ${payload.callerName ?? "the caller"}: ${payload.notes}`
    : undefined;
  const callback = payload.callerNumber
    ? `If you have questions, please call back at ${payload.callerNumber}.`
    : "If you have any questions, please reach out to them at your convenience.";

  return [greeting, introduction, objective, notes, callback, "Thank you and goodbye!"]
    .filter(Boolean)
    .join(" ");
};

const ensureTwilioEnv = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "Missing Twilio configuration. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
    );
  }

  return { accountSid, authToken, fromNumber };
};

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, message: firstIssue?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const { accountSid, authToken, fromNumber } = ensureTwilioEnv();
    const script = buildCallScript(parsed.data);

    const twilio = await import("twilio");
    const client = twilio.default(accountSid, authToken);

    const call = await client.calls.create({
      to: parsed.data.recipientNumber,
      from: fromNumber,
      twiml: `<Response><Say voice="Polly.Joey" language="en-US">${escapeForXml(
        script
      )}</Say></Response>`
    });

    const message = `Call queued with SID ${call.sid}. Twilio will place the call shortly.`;
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Failed to queue call", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error while attempting to trigger the call.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

const escapeForXml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
