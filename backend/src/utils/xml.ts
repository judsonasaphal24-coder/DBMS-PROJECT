type XmlTransaction = {
  id: string;
  senderEmail: string;
  receiverEmail: string;
  amount: number;
  status: string;
  retryCount: number;
  createdAt: Date;
  description?: string | null;
  failureReason?: string | null;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const buildTransactionXml = (items: XmlTransaction[]) => {
  const rows = items
    .map(
      (tx) =>
        `    <transaction>\n      <id>${escapeXml(tx.id)}</id>\n      <senderEmail>${escapeXml(tx.senderEmail)}</senderEmail>\n      <receiverEmail>${escapeXml(tx.receiverEmail)}</receiverEmail>\n      <amount>${tx.amount}</amount>\n      <status>${escapeXml(tx.status)}</status>\n      <retryCount>${tx.retryCount}</retryCount>\n      <createdAt>${tx.createdAt.toISOString()}</createdAt>\n      <description>${escapeXml(tx.description ?? "")}</description>\n      <failureReason>${escapeXml(tx.failureReason ?? "")}</failureReason>\n    </transaction>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<transactions>\n${rows}\n</transactions>`;
};
