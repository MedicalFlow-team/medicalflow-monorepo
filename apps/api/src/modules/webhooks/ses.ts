import { Elysia, t } from "elysia";
import { createVerify } from "node:crypto";

const notification = t.Object({
  Type: t.Optional(t.String()),
  MessageId: t.Optional(t.String()),
  SubscribeURL: t.Optional(t.String({ format: "uri" })),
  Message: t.Optional(t.String()),
  SigningCertURL: t.Optional(t.String({ format: "uri" })),
  Signature: t.Optional(t.String()),
  Token: t.Optional(t.String()),
  TopicArn: t.Optional(t.String()),
});

async function verifySns(body: typeof notification.static) {
  if (!body.SigningCertURL || !body.Signature || !body.Type) return false;
  const certUrl = new URL(body.SigningCertURL);
  if (
    certUrl.protocol !== "https:" ||
    !certUrl.hostname.endsWith(".amazonaws.com")
  )
    return false;
  const fields =
    body.Type === "Notification"
      ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
      : [
          "Message",
          "MessageId",
          "SubscribeURL",
          "Timestamp",
          "Token",
          "TopicArn",
          "Type",
        ];
  const source = fields
    .filter(
      (field) =>
        field in body && body[field as keyof typeof body] !== undefined,
    )
    .map((field) => `${field}\n${body[field as keyof typeof body]}\n`)
    .join("");
  const cert = await (await fetch(certUrl)).text();
  const verifier = createVerify("RSA-SHA256");
  verifier.update(source);
  return verifier.verify(cert, Buffer.from(body.Signature, "base64"));
}

export const sesWebhook = new Elysia({ name: "ses-webhook" }).post(
  "/webhooks/ses",
  async ({ body, status }) => {
    if (!(await verifySns(body))) return status(403, { accepted: false });
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      await fetch(body.SubscribeURL);
      return status(200, { accepted: true });
    }
    if (body.Type !== "Notification" || !body.Message)
      return status(400, { accepted: false });
    try {
      const event = JSON.parse(body.Message) as {
        eventType?: string;
        mail?: { messageId?: string };
      };
      console.info(
        JSON.stringify({
          msg: "ses_event",
          messageId: event.mail?.messageId ?? null,
          status: event.eventType ?? "UNKNOWN",
        }),
      );
      return status(204);
    } catch {
      return status(400, { accepted: false });
    }
  },
  { body: notification },
);
