import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886"; // Twilio sandbox default

export function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }
  return twilio(accountSid, authToken);
}

export async function sendWhatsApp(to: string, message: string): Promise<{ sid: string }> {
  const client = getTwilioClient();
  // Ensure the number is in whatsapp: format
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const msg = await client.messages.create({
    from: fromNumber,
    to: toFormatted,
    body: message,
  });
  return { sid: msg.sid };
}

// Pre-built message templates
export const NotificationTemplates = {
  rentReminder: (tenantName: string, amount: number, dueDate: string) =>
    `Hi ${tenantName}! 👋 This is a friendly reminder that your rent of $${amount.toFixed(2)} is due on ${dueDate}. Please ensure payment is made on time to avoid late fees. Reply HELP for assistance. — YasithSystems Property Management`,

  rentOverdue: (tenantName: string, amount: number, daysOverdue: number) =>
    `Hi ${tenantName}, your rent payment of $${amount.toFixed(2)} is now ${daysOverdue} day(s) overdue. A late fee of $50 has been applied. Please make payment as soon as possible or contact us to discuss your situation. — YasithSystems`,

  leaseExpiry: (tenantName: string, unitNumber: string, expiryDate: string, daysLeft: number) =>
    `Hi ${tenantName}! Your lease for Unit ${unitNumber} expires on ${expiryDate} (${daysLeft} days away). Please contact us to discuss renewal options. We'd love to have you stay! 🏠 — YasithSystems`,

  maintenanceUpdate: (tenantName: string, requestTitle: string, status: string, assignedTo?: string) => {
    const assignedPart = assignedTo ? ` ${assignedTo} has been assigned.` : "";
    return `Hi ${tenantName}, update on your maintenance request "${requestTitle}": Status changed to *${status}*.${assignedPart} We'll keep you posted. — YasithSystems`;
  },

  maintenanceBooked: (tenantName: string, requestTitle: string, technicianName: string) =>
    `Hi ${tenantName}! A technician (${technicianName}) has been scheduled for your "${requestTitle}" request. They will contact you to confirm timing. — YasithSystems`,
};
