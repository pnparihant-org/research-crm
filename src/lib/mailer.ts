import nodemailer from "nodemailer";

async function safeSendMail(transporter: nodemailer.Transporter, options: nodemailer.SendMailOptions, label: string) {
  try {
    await transporter.sendMail(options);
    console.log(`[mailer] ${label} — sent successfully`);
  } catch (err) {
    console.error(`[mailer] ${label} — FAILED:`, err);
    throw new Error(`Failed to send email (${label}). Please try again later.`);
  }
}

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendLoginOtpEmail(to: string, otp: string) {
  console.log(`[mailer] sendLoginOtpEmail — to=${to}`);
  const transporter = createTransporter();
  await safeSendMail(transporter, {
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: "Your OTP for Arihant Capital Markets Research Servicing Tracker",
    text: `Your OTP for Arihant Capital Markets Research Servicing Tracker login is ${otp}. Valid till midnight today (IST). Do not share this OTP with anyone. - ARIHANT`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1e3a5f;margin:0;">Arihant Capital Markets</h2>
          <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Research Servicing Tracker</p>
        </div>
        <p style="color:#374151;font-size:15px;">Your login OTP is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#1e3a5f;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">Valid till <strong>midnight today (IST)</strong>. Do not share this OTP with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:11px;text-align:center;">— ARIHANT</p>
      </div>
    `,
  }, `sendLoginOtpEmail to=${to}`);
}

export async function sendDailyTemplateEmail(
  to: string,
  name: string,
  dateLabel: string,
  attachment: Buffer
) {
  console.log(`[mailer] sendDailyTemplateEmail — to=${to}`);
  const transporter = createTransporter();
  await safeSendMail(transporter, {
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: `CRM — Daily Submission Template (${dateLabel})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1e3a5f;margin:0;">Arihant Capital Markets</h2>
          <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Research Servicing Tracker</p>
        </div>
        <p style="color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:14px;">
          Please find today's submission template attached. Fill in your entries and upload via the CRM portal before <strong>7:00 PM IST</strong> today.
        </p>
        <p style="color:#6b7280;font-size:13px;">Date: <strong>${dateLabel}</strong></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:11px;text-align:center;">— Arihant Capital Markets CRM</p>
      </div>
    `,
    attachments: [
      {
        filename: `CRM_Template_${dateLabel.replace(/\//g, "-")}.xlsx`,
        content: attachment,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  }, `sendDailyTemplateEmail to=${to}`);
}

export async function sendEODReminderEmail(
  to: string,
  name: string,
  timestamp: string
) {
  console.log(`[mailer] sendEODReminderEmail — to=${to}`);
  const transporter = createTransporter();
  await safeSendMail(transporter, {
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: `CRM — Reminder: Sheet Not Submitted Today`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1e3a5f;margin:0;">Arihant Capital Markets</h2>
          <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Research Servicing Tracker</p>
        </div>
        <p style="color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:14px;">
          This is a reminder that your daily submission sheet has <strong>not been uploaded</strong> yet for today.
        </p>
        <p style="color:#374151;font-size:14px;">
          Please log in to the CRM portal and submit your entries immediately.
        </p>
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:16px 0;">
          <p style="color:#92400e;font-size:13px;margin:0;">
            <strong>Notice:</strong> If your sheet is not submitted within the next <strong>15 minutes</strong>, your manager will be notified.
          </p>
        </div>
        <p style="color:#6b7280;font-size:12px;">Check time: <strong>${timestamp}</strong> IST</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:11px;text-align:center;">— Arihant Capital Markets CRM</p>
      </div>
    `,
  }, `sendEODReminderEmail to=${to}`);
}

export async function sendEscalationEmail(
  to: string,
  missingUsers: { name: string; email: string }[],
  timestamp: string,
  totalUsers: number
) {
  console.log(`[mailer] sendEscalationEmail — to=${to}, missing=${missingUsers.length}`);
  const transporter = createTransporter();
  const rows = missingUsers
    .map(
      (u, i) =>
        `<tr style="background:${i % 2 === 0 ? "#fef2f2" : "#fff"};">
          <td style="padding:8px 12px;border:1px solid #fecaca;">${i + 1}</td>
          <td style="padding:8px 12px;border:1px solid #fecaca;">${u.name}</td>
          <td style="padding:8px 12px;border:1px solid #fecaca;">${u.email}</td>
        </tr>`
    )
    .join("");

  await safeSendMail(transporter, {
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: `CRM — ESCALATION: ${missingUsers.length} User(s) Still Have Not Submitted`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:32px;border:2px solid #ef4444;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1e3a5f;margin:0;">Arihant Capital Markets</h2>
          <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Research Servicing Tracker — Escalation Alert</p>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
          <p style="color:#991b1b;font-size:14px;margin:0;">
            <strong>Action Required:</strong> The following ${missingUsers.length} out of ${totalUsers} user(s) were sent a warning at 7:00 PM IST but have <strong>still not submitted</strong> their daily sheet.
          </p>
        </div>
        <p style="color:#6b7280;font-size:12px;margin-bottom:16px;">Escalation time: <strong>${timestamp}</strong> IST</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#991b1b;color:#fff;">
              <th style="padding:10px 12px;border:1px solid #991b1b;text-align:left;">#</th>
              <th style="padding:10px 12px;border:1px solid #991b1b;text-align:left;">Name</th>
              <th style="padding:10px 12px;border:1px solid #991b1b;text-align:left;">Email</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#374151;font-size:13px;margin-top:20px;">
          You may upload on their behalf via the Master Admin portal if required.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:11px;text-align:center;">— Arihant Capital Markets CRM</p>
      </div>
    `,
  }, `sendEscalationEmail to=${to}`);
}

export async function sendEODSummaryEmail(
  to: string,
  missingUsers: { name: string; email: string }[],
  timestamp: string,
  totalUsers: number
) {
  console.log(`[mailer] sendEODSummaryEmail — to=${to}, missing=${missingUsers.length}`);
  const transporter = createTransporter();
  const rows = missingUsers
    .map(
      (u, i) =>
        `<tr style="background:${i % 2 === 0 ? "#f9fafb" : "#fff"};">
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${i + 1}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${u.name}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${u.email}</td>
        </tr>`
    )
    .join("");

  await safeSendMail(transporter, {
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: `CRM — EOD Summary: ${missingUsers.length} of ${totalUsers} Users Yet to Submit`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1e3a5f;margin:0;">Arihant Capital Markets</h2>
          <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Research Servicing Tracker — EOD Summary</p>
        </div>
        <p style="color:#374151;font-size:15px;">
          <strong>${missingUsers.length}</strong> out of <strong>${totalUsers}</strong> users have not submitted their sheet today.
        </p>
        <p style="color:#6b7280;font-size:12px;margin-bottom:16px;">Check time: <strong>${timestamp}</strong> IST</p>
        ${
          missingUsers.length > 0
            ? `<table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr style="background:#1e3a5f;color:#fff;">
                    <th style="padding:10px 12px;border:1px solid #1e3a5f;text-align:left;">#</th>
                    <th style="padding:10px 12px;border:1px solid #1e3a5f;text-align:left;">Name</th>
                    <th style="padding:10px 12px;border:1px solid #1e3a5f;text-align:left;">Email</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>`
            : `<p style="color:#16a34a;font-weight:bold;">All users have submitted their sheets. ✓</p>`
        }
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:11px;text-align:center;">— Arihant Capital Markets CRM</p>
      </div>
    `,
  }, `sendEODSummaryEmail to=${to}`);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  console.log(`[mailer] sendPasswordResetEmail — to=${to}`);
  const transporter = createTransporter();
  await safeSendMail(transporter, {
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: "CRM — Reset your password",
    html: `
      <p>Hi ${name},</p>
      <p>Click the link below to reset your password. The link expires in <strong>1 hour</strong>.</p>
      <p><a href="${resetUrl}" style="color:#2B9443;font-weight:bold;">Reset Password</a></p>
      <p>If you did not request this, ignore this email.</p>
      <p style="color:#9ca3af;font-size:12px;">Arihant Capital Markets — CRM</p>
    `,
  }, `sendPasswordResetEmail to=${to}`);
}
