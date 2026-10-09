import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { Env } from "../config/env";

/**
 * Mailer — interface mínima + implementação plugável (issue #207/#209).
 *
 * Desacoplado por design: os services de domínio dependem só da interface.
 * - ConsoleMailer: dev/testes (loga o link, nada sai da máquina).
 * - SesMailer: produção via API do Amazon SES.
 */
export interface Mailer {
  send(params: { to: string; subject: string; text: string; html?: string }): Promise<void>;
}

export class DisabledMailer implements Mailer {
  async send(): Promise<void> {
    throw new Error("Entrega de e-mail desativada.");
  }
}

export function createMailer(env: Env): Mailer {
  if (env.mailProvider === "disabled") return new DisabledMailer();
  if (env.mailProvider === "console" && env.nodeEnv !== "production")
    return new ConsoleMailer();
  if (
    env.mailProvider === "ses" &&
    env.nodeEnv === "production" &&
    env.sesRegion &&
    env.mailFrom
  ) {
    return new SesMailer(env.sesRegion, env.mailFrom);
  }
  throw new Error("Configuração de e-mail inválida.");
}

export class ConsoleMailer implements Mailer {
  async send(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    console.info(
      `[mailer:console] to=${params.to} subject="${params.subject}"\n${params.text}`,
    );
  }
}

type SendViaSes = (
  command: SendEmailCommand,
) => Promise<{ MessageId?: string }>;

export class SesMailer implements Mailer {
  private readonly sendViaSes: SendViaSes;

  constructor(
    region: string,
    private readonly from: string,
    sendViaSes?: SendViaSes,
  ) {
    if (sendViaSes) {
      this.sendViaSes = sendViaSes;
    } else {
      const client = new SESv2Client({ region });
      this.sendViaSes = (command) =>
        client.send(command, { abortSignal: AbortSignal.timeout(10_000) });
    }
  }

  async send(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const result = await this.sendViaSes(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [params.to] },
        Content: {
          Simple: {
            Subject: { Data: params.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: params.text, Charset: "UTF-8" },
              ...(params.html
                ? { Html: { Data: params.html, Charset: "UTF-8" } }
                : {}),
            },
          },
        },
      }),
    );
    console.info(
      JSON.stringify({
        msg: "auth_email_accepted",
        provider: "ses",
        messageId: result.MessageId ?? null,
      }),
    );
  }
}
