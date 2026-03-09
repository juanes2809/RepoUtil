const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

interface WhatsAppButton {
  id: string;
  title: string;
}

export async function sendWhatsAppMessage(to: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('[WhatsApp] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
    return { success: false, error: 'Missing WhatsApp configuration' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] API error:', data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[WhatsApp] Send error:', error);
    return { success: false, error };
  }
}

export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[]
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('[WhatsApp] Missing configuration');
    return { success: false, error: 'Missing WhatsApp configuration' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.map(btn => ({
                type: 'reply',
                reply: { id: btn.id, title: btn.title },
              })),
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] Buttons API error:', data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[WhatsApp] Buttons send error:', error);
    return { success: false, error };
  }
}

interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

export async function sendWhatsAppList(
  to: string,
  bodyText: string,
  buttonText: string,
  rows: WhatsAppListRow[]
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('[WhatsApp] Missing configuration');
    return { success: false, error: 'Missing WhatsApp configuration' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: bodyText },
            action: {
              button: buttonText,
              sections: [
                {
                  title: 'Opciones',
                  rows: rows.map(row => ({
                    id: row.id,
                    title: row.title,
                    description: row.description || '',
                  })),
                },
              ],
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] List API error:', data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[WhatsApp] List send error:', error);
    return { success: false, error };
  }
}

export async function sendAdminNotification(text: string) {
  const adminPhone = process.env.WHATSAPP_ADMIN_PHONE;

  if (!adminPhone) {
    console.error('[WhatsApp] Missing WHATSAPP_ADMIN_PHONE');
    return { success: false, error: 'Missing admin phone' };
  }

  return sendWhatsAppMessage(adminPhone, text);
}
