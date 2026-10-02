/**
 * Mailer — interface mínima + implementação plugável (issue #207/#209).
 *
 * Desacoplado por design: os services de domínio dependem só da interface.
 * - ConsoleMailer: dev/testes (loga o link, nada sai da máquina).
 * - SmtpMailer: produção, quando SMTP_URL existir (interação real depois).
 */
export interface Mailer {
  send(params: { to: string; subject: string; text: string }): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async send(params: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    console.info(
      `[mailer:console] to=${params.to} subject="${params.subject}"\n${params.text}`,
    );
  }
}
