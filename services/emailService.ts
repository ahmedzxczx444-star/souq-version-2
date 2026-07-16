// Transactional email sending via the official Brevo REST API only (no SMTP).
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export function buildOtpEmailHtml(otp: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; color: #111827;">
      <h2 style="margin: 0 0 24px; font-size: 20px; font-weight: 800; color: #111827;">Souq Cars</h2>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Hello,</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Your verification code is:</p>
      <div style="font-size: 32px; font-weight: 800; letter-spacing: 10px; text-align: center; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 16px; padding: 20px; margin: 0 0 20px;">
        ${otp}
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">This code expires in 5 minutes.</p>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 24px;">If you did not create this account, please ignore this email.</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0;">Thank you,<br/>Souq Cars Team</p>
    </div>
  `;
}

async function sendTransactionalEmail(to: { email: string; name?: string }, subject: string, htmlContent: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    // Local/dev fallback only — production must always have BREVO_API_KEY set.
    console.log(`[EMAIL SIMULATION] BREVO_API_KEY not set. Would send "${subject}" to ${to.email}.`);
    return;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@souqcars.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Souq Cars";

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [to],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Brevo API error (${response.status}): ${errText}`);
  }
}

export async function sendOtpEmail(email: string, otp: string, name?: string): Promise<void> {
  await sendTransactionalEmail(
    { email, name },
    "Souq Cars - Verification Code",
    buildOtpEmailHtml(otp)
  );
}
