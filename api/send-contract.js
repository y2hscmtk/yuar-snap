/* global process, Buffer */

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const GMAIL_PROFILE_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';

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
    const errorCode = normalizeString(result?.error);
    const errorDescription = normalizeString(result?.error_description);
    const message = errorCode && errorDescription
      ? `${errorCode}: ${errorDescription}`
      : (errorDescription || errorCode || 'Failed to fetch Google access token');
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

const getAuthenticatedGmailAddress = async ({ accessToken }) => {
  const response = await fetch(GMAIL_PROFILE_API_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result?.error?.message === 'string'
      ? result.error.message
      : 'Failed to fetch authenticated Gmail profile';
    throw new Error(message);
  }

  const emailAddress = normalizeString(result?.emailAddress).toLowerCase();
  if (!emailAddress || !isValidEmail(emailAddress)) {
    throw new Error('Authenticated Gmail profile email is empty');
  }

  return emailAddress;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ownerEmail = normalizeString(process.env.OWNER_EMAIL);
  const configuredSenderEmail = normalizeString(process.env.GMAIL_SENDER_EMAIL).toLowerCase();
  const gmailClientId = normalizeString(process.env.GMAIL_CLIENT_ID);
  const gmailClientSecret = normalizeString(process.env.GMAIL_CLIENT_SECRET);
  const gmailRefreshToken = normalizeString(process.env.GMAIL_REFRESH_TOKEN);

  if (!ownerEmail || !isValidEmail(ownerEmail)) {
    return res.status(500).json({ error: 'Missing or invalid OWNER_EMAIL' });
  }
  if (configuredSenderEmail && !isValidEmail(configuredSenderEmail)) {
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

    const authenticatedSenderEmail = await getAuthenticatedGmailAddress({ accessToken });
    if (configuredSenderEmail && configuredSenderEmail !== authenticatedSenderEmail) {
      return res.status(500).json({
        error: 'GMAIL_SENDER_EMAIL mismatch',
        details: `Authenticated Gmail account is ${authenticatedSenderEmail}. Please update GMAIL_SENDER_EMAIL to the same address.`
      });
    }

    const senderEmail = configuredSenderEmail || authenticatedSenderEmail;

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
    const details = error instanceof Error ? error.message : 'unknown';
    const normalizedDetails = details.toLowerCase();
    let hint = '';

    if (normalizedDetails.includes('invalid_grant')) {
      hint = 'GMAIL_REFRESH_TOKEN이 만료/폐기되었을 수 있습니다. OAuth Playground에서 refresh token을 다시 발급하고 Vercel 환경변수를 갱신하세요.';
    } else if (
      normalizedDetails.includes('invalid_client') ||
      normalizedDetails.includes('unauthorized')
    ) {
      hint = 'GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET 조합이 잘못됐거나, refresh token을 발급한 OAuth 클라이언트와 일치하지 않습니다. 같은 OAuth Client에서 값 3개(ID/SECRET/REFRESH_TOKEN)를 다시 발급해 모두 교체하세요.';
    } else if (
      normalizedDetails.includes('insufficient authentication scopes') ||
      normalizedDetails.includes('request had insufficient authentication scopes')
    ) {
      hint = 'OAuth scope에 https://www.googleapis.com/auth/gmail.send 를 포함해 refresh token을 다시 발급하세요.';
    } else if (
      normalizedDetails.includes('gmail api has not been used') ||
      normalizedDetails.includes('api has not been used')
    ) {
      hint = 'Google Cloud 프로젝트에서 Gmail API를 활성화한 뒤 잠시 기다렸다가 다시 시도하세요.';
    }

    return res.status(500).json({
      error: 'Unexpected Gmail send error',
      details,
      hint
    });
  }
}
