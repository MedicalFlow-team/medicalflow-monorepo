import { createVerify } from "node:crypto";
import { Elysia } from "elysia";

type SnsMessage = Record<string, unknown>;

const SIGNED_FIELDS = {
  Notification: [
    "Message",
    "MessageId",
    "Subject",
    "Timestamp",
    "TopicArn",
    "Type",
  ],
  SubscriptionConfirmation: [
    "Message",
    "MessageId",
    "SubscribeURL",
    "Timestamp",
    "Token",
    "TopicArn",
    "Type",
  ],
} as const;

function isSnsMessage(value: unknown): value is SnsMessage {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function verifySns(body: SnsMessage, topicArn: string): Promise<boolean> {
  if (body.TopicArn !== topicArn || body.SignatureVersion !== "2") return false;
  if (body.Type !== "Notification" && body.Type !== "SubscriptionConfirmation")
    return false;
  if (
    typeof body.SigningCertURL !== "string" ||
    typeof body.Signature !== "string"
  )
    return false;

  let certUrl: URL;
  try {
    certUrl = new URL(body.SigningCertURL);
  } catch {
    return false;
  }
  const region = topicArn.split(":")[3];
  if (
    certUrl.protocol !== "https:" ||
    certUrl.hostname !== `sns.${region}.amazonaws.com` ||
    certUrl.port ||
    certUrl.username ||
    certUrl.password ||
    certUrl.search ||
    certUrl.hash ||
    !/^\/SimpleNotificationService-[a-zA-Z0-9]+\.pem$/.test(certUrl.pathname)
  )
    return false;

  const fields = SIGNED_FIELDS[body.Type];
  if (
    fields.some(
      (field) => field !== "Subject" && typeof body[field] !== "string",
    )
  )
    return false;
  if (body.Subject !== undefined && typeof body.Subject !== "string")
    return false;
  const source = fields
    .filter((field) => body[field] !== undefined)
    .map((field) => `${field}\n${body[field]}\n`)
    .join("");
  try {
    const response = await fetch(certUrl, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const cert = await response.text();
    const verifier = createVerify("RSA-SHA256");
    verifier.update(source);
    return verifier.verify(cert, Buffer.from(body.Signature, "base64"));
  } catch {
    return false;
  }
}

export function createSesWebhook(topicArn: string | null) {
  return new Elysia({ name: "ses-webhook" }).post(
    "/webhooks/ses",
    async ({ body: parsedBody, status }) => {
      if (!topicArn) return status(503, { accepted: false });
      let body: unknown = parsedBody;
      try {
        if (typeof body === "string") body = JSON.parse(body);
      } catch {
        return status(400, { accepted: false });
      }
      if (!isSnsMessage(body) || !(await verifySns(body, topicArn)))
        return status(403, { accepted: false });

      if (body.Type === "SubscriptionConfirmation") {
        const url = new URL(body.SubscribeURL as string);
        if (
          url.protocol !== "https:" ||
          url.hostname !== `sns.${topicArn.split(":")[3]}.amazonaws.com`
        )
          return status(403, { accepted: false });
        try {
          const confirmation = await fetch(url, {
            signal: AbortSignal.timeout(3000),
          });
          if (!confirmation.ok) return status(502, { accepted: false });
          return { accepted: true };
        } catch {
          return status(502, { accepted: false });
        }
      }

      try {
        const event = JSON.parse(body.Message as string) as {
          eventType?: string;
          mail?: { messageId?: string };
        };
        if (
          !["Delivery", "Bounce", "Complaint"].includes(
            event.eventType ?? "",
          ) ||
          typeof event.mail?.messageId !== "string"
        )
          return status(400, { accepted: false });
        console.info(
          JSON.stringify({
            msg: "ses_event",
            messageId: event.mail.messageId,
            status: event.eventType,
          }),
        );
        return status(204);
      } catch {
        return status(400, { accepted: false });
      }
    },
  );
}
