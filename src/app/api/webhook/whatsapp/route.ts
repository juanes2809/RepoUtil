import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/chatbot';

// GET: Webhook verification (Meta sends this to verify the endpoint)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST: Incoming messages from WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta sends various webhook events - we only care about messages
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      // Not a message event (could be status update, etc.)
      return NextResponse.json({ received: true });
    }

    const message = value.messages[0];
    const phone = message.from; // Sender's phone number

    // Determine message type
    let messageText = '';
    let isButtonReply = false;
    let buttonId: string | undefined;

    if (message.type === 'text') {
      messageText = message.text?.body || '';
    } else if (message.type === 'interactive') {
      // Button reply or list reply
      if (message.interactive?.type === 'button_reply') {
        isButtonReply = true;
        buttonId = message.interactive.button_reply.id;
        messageText = message.interactive.button_reply.title;
      } else if (message.interactive?.type === 'list_reply') {
        isButtonReply = true;
        buttonId = message.interactive.list_reply.id;
        messageText = message.interactive.list_reply.title;
      }
    } else {
      // Unsupported message type (image, audio, etc.)
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
      await sendWhatsAppMessage(phone, '⚠️ Solo puedo leer *mensajes de texto*.\n\nNotas de voz, imágenes, stickers y archivos no son compatibles.\n\nEscribe "menu" para ver las opciones disponibles.');
      return NextResponse.json({ received: true });
    }

    // Process the message
    await handleIncomingMessage(phone, messageText, isButtonReply, buttonId);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json({ received: true });
  }
}
