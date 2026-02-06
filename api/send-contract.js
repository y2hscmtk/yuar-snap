/* global process, Buffer */

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isValidEmail = (value) => EMAIL_REGEX.test(normalizeString(value));

const toSafeFilename = (value) => {
  const fallback = 'signed-contract.pdf';
  const raw = normalizeString(value) || fallback;
  const withoutSpecial = raw
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');
  const withoutControls = [...withoutSpecial]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 32 || code === 127 ? '_' : ch;
    })
    .join('');
  const withPdfExt = withoutControls.toLowerCase().endsWith('.pdf')
    ? withoutControls
    : `${withoutControls}.pdf`;
  return withPdfExt.slice(0, 120);
};

const encodeHeaderUtf8 = (text) => {
  const normalized = normalizeString(text);
  if (!normalized) return '';
  return `=?UTF-8?B?${Buffer.from(normalized, 'utf8').toString('base64')}?=`;
};

const toBase64Url = (text) => {
  return Buffer.from(text, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const buildMailText = (summary = {}) => {
  const contractorName = normalizeString(summary.contractorName) || '미정';
  const weddingDate = normalizeString(summary.weddingDate) || '미정';
  const weddingTime = normalizeString(summary.weddingTime) || '미정';
  const venue = normalizeString(summary.venue) || '미정';
  const finalPrice = normalizeString(summary.finalPrice) || '미정';

  return [
    '서명 완료된 계약서 PDF를 첨부합니다.',
    '',
    `계약자: ${contractorName}`,
    `예식일: ${weddingDate}`,
    `예식시간: ${weddingTime}`,
    `예식장: ${venue}`,
    `최종가격: ${finalPrice}`,
    '',
    '본 메일은 시스템에서 자동 발송되었습니다.'
  ].join('\n');
};

const createRawMimeMessage = ({ from, recipients, subject, text, fileName, pdfBase64 }) => {
  const boundary = `contract_boundary_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const sanitizedPdfBase64 = normalizeString(pdfBase64).replace(/\s/g, '');
  const attachmentBody = sanitizedPdfBase64.match(/.{1,76}/g)?.join('\r\n') || sanitizedPdfBase64;
  const encodedSubject = encodeHeaderUtf8(subject);
  const safeText = normalizeString(text).replace(/\r?\n/g, '\r\n');

  const lines = [
    `From: ${from}`,
    `To: ${recipients.join(', ')}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    safeText,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${fileName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${fileName}"`,
    '',
    attachmentBody,
    '',
    `--${boundary}--`,
    ''
  ];

  return toBase64Url(lines.join('\r\n'));
};

const getGoogleAccessToken = async ({ clientId, clientSecret, refreshToken }) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result?.error_description === 'string'
      ? result.error_description
      : 'Failed to fetch Google access token';
    throw new Error(message);
  }

  const accessToken = normalizeString(result?.access_token);
  if (!accessToken) {
    throw new Error('Google access token is empty');
  }
  return accessToken;
};

const sendWithGmailApi = async ({ accessToken, rawMessage }) => {
  const response = await fetch(GMAIL_SEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: rawMessage })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result?.error?.message === 'string'
      ? result.error.message
      : 'Failed to send Gmail message';
    throw new Error(message);
  }

  return result;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ownerEmail = normalizeString(process.env.OWNER_EMAIL);
  const senderEmail = normalizeString(process.env.GMAIL_SENDER_EMAIL).toLowerCase();
  const gmailClientId = normalizeString(process.env.GMAIL_CLIENT_ID);
  const gmailClientSecret = normalizeString(process.env.GMAIL_CLIENT_SECRET);
  const gmailRefreshToken = normalizeString(process.env.GMAIL_REFRESH_TOKEN);

  if (!ownerEmail || !isValidEmail(ownerEmail)) {
    return res.status(500).json({ error: 'Missing or invalid OWNER_EMAIL' });
  }
  if (!senderEmail || !isValidEmail(senderEmail)) {
    return res.status(500).json({ error: 'Missing or invalid GMAIL_SENDER_EMAIL' });
  }
  if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken) {
    return res.status(500).json({ error: 'Missing Gmail OAuth envs (GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN)' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
  }

  const pdfBase64 = normalizeString(payload?.pdfBase64);
  const fileName = toSafeFilename(payload?.fileName);
  const contractorEmail = normalizeString(payload?.contractorEmail).toLowerCase();
  const contractSummary = payload?.contractSummary || {};

  if (!pdfBase64) {
    return res.status(400).json({ error: 'Missing pdfBase64' });
  }
  if (!contractorEmail || !isValidEmail(contractorEmail)) {
    return res.status(400).json({ error: 'Missing or invalid contractorEmail' });
  }

  const recipients = [...new Set([contractorEmail, ownerEmail.toLowerCase()])];
  const contractorName = normalizeString(contractSummary.contractorName) || '계약자';
  const subject = `서명 완료 계약서 - ${contractorName}`;
  const text = buildMailText(contractSummary);

  try {
    const accessToken = await getGoogleAccessToken({
      clientId: gmailClientId,
      clientSecret: gmailClientSecret,
      refreshToken: gmailRefreshToken
    });

    const rawMessage = createRawMimeMessage({
      from: senderEmail,
      recipients,
      subject,
      text,
      fileName,
      pdfBase64
    });

    const result = await sendWithGmailApi({
      accessToken,
      rawMessage
    });

    return res.status(200).json({
      ok: true,
      id: result?.id,
      threadId: result?.threadId,
      recipients
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Unexpected Gmail send error',
      details: error instanceof Error ? error.message : 'unknown'
    });
  }
}
