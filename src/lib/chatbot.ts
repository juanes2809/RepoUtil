import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage, sendWhatsAppList } from '@/lib/whatsapp';
import { chatWithGemini } from '@/lib/gemini';

// Session timeout: 5 minutes of inactivity
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
// Cleanup interval: every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

type SessionMode = 'menu' | 'products' | 'order_lookup';

interface ConversationSession {
  mode: SessionMode;
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  lastActivity: number;
}

// In-memory session store
const sessions = new Map<string, ConversationSession>();

// Cleanup inactive sessions periodically
let cleanupTimer: NodeJS.Timeout | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, phone) => {
      if (now - session.lastActivity > CLEANUP_INTERVAL_MS) {
        sessions.delete(phone);
      }
    });
  }, CLEANUP_INTERVAL_MS);
  // Don't prevent Node from exiting
  if (cleanupTimer.unref) cleanupTimer.unref();
}

function getSession(phone: string): ConversationSession | null {
  const session = sessions.get(phone);
  if (!session) return null;

  // Check timeout
  if (Date.now() - session.lastActivity > SESSION_TIMEOUT_MS) {
    sessions.delete(phone);
    return null;
  }

  session.lastActivity = Date.now();
  return session;
}

function createSession(phone: string, mode: SessionMode = 'menu'): ConversationSession {
  const session: ConversationSession = {
    mode,
    messages: [],
    lastActivity: Date.now(),
  };
  sessions.set(phone, session);
  return session;
}

async function sendMainMenu(phone: string, isFirstMessage: boolean = false) {
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda';
  const storeHours = process.env.NEXT_PUBLIC_STORE_HOURS || '';

  let greeting = '';
  if (isFirstMessage) {
    greeting = `👋 *¡Bienvenido a ${businessName}!*\n\n` +
      `Soy tu asistente virtual y estoy aquí para ayudarte.\n` +
      (storeHours ? `🕐 Horario de atención: ${storeHours}\n\n` : '\n') +
      `⚠️ _Solo puedo leer mensajes de texto. Notas de voz, imágenes y otros archivos no son compatibles._\n\n` +
      `Selecciona una opción para comenzar:`;
  } else {
    greeting = `¿En qué más puedo ayudarte? Selecciona una opción:`;
  }

  await sendWhatsAppList(
    phone,
    greeting,
    'Ver opciones',
    [
      { id: 'btn_products', title: '📋 Productos', description: 'Consulta precios y disponibilidad' },
      { id: 'btn_buy', title: '🛒 Quiero comprar', description: 'Te envío el link de la tienda' },
      { id: 'btn_order', title: '📦 Mi pedido', description: 'Consulta el estado de tu pedido' },
      { id: 'btn_human', title: '💬 Hablar con nosotros', description: 'Chatea directo con una persona' },
    ]
  );
}

async function handleProductsMode(phone: string, session: ConversationSession, message: string) {
  // Check if user wants to go back to menu
  if (message.toLowerCase() === 'menu' || message.toLowerCase() === 'volver') {
    sessions.delete(phone);
    await sendMainMenu(phone);
    return;
  }

  try {
    // Fetch products for context (only on first message or refresh)
    const { data: products } = await supabaseAdmin!
      .from('products')
      .select('name, price, stock, description, categories(name)')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('name');

    const productList = products
      ?.map(p => {
        const cats = (p.categories as any[])?.map((c: any) => c.name).join(', ');
        return `- ${p.name}${cats ? ` [${cats}]` : ''}: $${p.price.toLocaleString('es-CO')} COP (${p.stock} disponibles)${p.description ? ` - ${p.description.substring(0, 100)}` : ''}`;
      })
      .join('\n') || 'No hay productos disponibles';

    const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    const systemPrompt = `Eres el asistente virtual amigable de "${businessName}", una tienda en línea colombiana.
Tu rol es ayudar a los clientes con información sobre productos.

CATÁLOGO ACTUAL:
${productList}

REGLAS:
- Responde SIEMPRE en español
- Sé conciso (máximo 300 caracteres por respuesta, es WhatsApp)
- Si preguntan por un producto específico, da precio, disponibilidad y descripción breve
- Si quieren comprar, diles que visiten: ${siteUrl}
- No inventes productos que no estén en el catálogo
- Si preguntan algo fuera de tu conocimiento, sugiere contactar la tienda
- Sé amable y usa un tono cercano
- El usuario puede escribir "menu" o "volver" para regresar al menú principal`;

    const response = await chatWithGemini(systemPrompt, session.messages, message);

    // Save conversation history (keep last 6 messages to control context size)
    session.messages.push({ role: 'user', text: message });
    session.messages.push({ role: 'model', text: response });
    if (session.messages.length > 6) {
      session.messages = session.messages.slice(-6);
    }

    await sendWhatsAppMessage(phone, response);
  } catch (error) {
    console.error('[Chatbot] Gemini error:', error);
    await sendWhatsAppMessage(phone, 'Lo siento, tuve un problema procesando tu mensaje. Por favor intenta de nuevo o escribe "menu" para volver al inicio.');
  }
}

async function handleOrderLookup(phone: string, session: ConversationSession, message: string) {
  // Check if user wants to go back to menu
  if (message.toLowerCase() === 'menu' || message.toLowerCase() === 'volver') {
    sessions.delete(phone);
    await sendMainMenu(phone);
    return;
  }

  // Try to find order by order number
  const orderNumber = message.trim().toUpperCase();

  const { data: order } = await supabaseAdmin!
    .from('orders')
    .select('order_number, status, payment_status, total, delivery_type, customer_name, created_at, items:order_items(product_name, quantity)')
    .or(`order_number.ilike.%${orderNumber}%`)
    .maybeSingle();

  if (!order) {
    await sendWhatsAppMessage(
      phone,
      `❌ No encontré un pedido con ese número.\n\nPor favor verifica el número e intenta de nuevo (ej: VPP-xxxxx).\n\nEscribe "menu" para volver al inicio.`
    );
    return;
  }

  const statusLabels: Record<string, string> = {
    pending: '⏳ Pendiente de pago',
    confirmed: '✅ Confirmado',
    processing: '📦 En preparación',
    shipped: '🚚 Enviado',
    completed: '✅ Completado',
    cancelled: '❌ Cancelado',
  };

  const items = order.items
    ?.map((item: any) => `  • ${item.product_name} x${item.quantity}`)
    .join('\n') || '';

  const statusText = statusLabels[order.status] || order.status;

  await sendWhatsAppMessage(
    phone,
    `📦 *Pedido #${order.order_number}*\n\n` +
    `Estado: ${statusText}\n` +
    `💰 Total: $${order.total.toLocaleString('es-CO')} COP\n` +
    `🚚 Tipo: ${order.delivery_type === 'delivery' ? 'Envío' : 'Recogida en tienda'}\n` +
    `📅 Fecha: ${new Date(order.created_at).toLocaleDateString('es-CO')}\n\n` +
    `📋 Productos:\n${items}\n\n` +
    `Escribe "menu" para volver al inicio.`
  );
}

export async function handleIncomingMessage(phone: string, message: string, isButtonReply: boolean, buttonId?: string) {
  ensureCleanupTimer();

  let session = getSession(phone);

  // Handle button replies
  if (isButtonReply && buttonId) {
    switch (buttonId) {
      case 'btn_products': {
        createSession(phone, 'products');
        await sendWhatsAppMessage(phone, '📋 ¡Pregúntame sobre nuestros productos! Puedo ayudarte con precios, disponibilidad y más.\n\nEscribe "menu" para volver al inicio.');
        return;
      }
      case 'btn_buy': {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
        await sendWhatsAppMessage(phone, `🛒 ¡Genial! Visita nuestra tienda para hacer tu compra:\n\n${siteUrl}\n\nEscribe "menu" para volver al inicio.`);
        sessions.delete(phone);
        return;
      }
      case 'btn_order': {
        createSession(phone, 'order_lookup');
        await sendWhatsAppMessage(phone, '📦 Por favor envíame tu número de pedido.\n\nEjemplo: VPP-1234567890-ABCDEF\n\nEscribe "menu" para volver al inicio.');
        return;
      }
      case 'btn_human': {
        const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda';
        const storeHours = process.env.NEXT_PUBLIC_STORE_HOURS || '';
        sessions.delete(phone);
        await sendWhatsAppMessage(
          phone,
          `💬 *¡Con gusto te atendemos!*\n\n` +
          `A partir de ahora tus mensajes serán leídos por nuestro equipo de *${businessName}*.\n` +
          (storeHours ? `\n🕐 Horario de atención: ${storeHours}\n` : '') +
          `\nEscríbenos tu consulta y te responderemos lo antes posible.\n\n` +
          `_Escribe "menu" en cualquier momento para volver al asistente virtual._`
        );
        return;
      }
    }
  }

  // No active session or timed out → show welcome/main menu
  if (!session) {
    createSession(phone, 'menu');
    await sendMainMenu(phone, true);
    return;
  }

  // Route based on current mode
  switch (session.mode) {
    case 'products':
      await handleProductsMode(phone, session, message);
      break;
    case 'order_lookup':
      await handleOrderLookup(phone, session, message);
      break;
    case 'menu':
    default:
      // User typed something instead of pressing a button - show menu again
      await sendMainMenu(phone);
      break;
  }
}
