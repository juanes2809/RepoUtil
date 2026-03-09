import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  deliveryCost: number;
  discount: number;
  total: number;
  deliveryType: string;
  address?: string;
  department?: string;
  city?: string;
}

interface PaymentFailedEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
}

export async function sendOrderConfirmation(data: OrderEmailData) {
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda';
  const businessEmail = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'contact@yourstore.com';
  const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+57 300 123 4567';
  const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || 'Dirección de la tienda';
  const storeCity = process.env.NEXT_PUBLIC_STORE_CITY || 'Ciudad';
  const storeHours = process.env.NEXT_PUBLIC_STORE_HOURS || 'Lunes a Viernes 8am - 6pm, Sábados 9am - 4pm';

  const deliveryInfo = data.deliveryType === 'delivery'
    ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-left: 4px solid #f5a438;">
        <h3 style="margin: 0 0 10px 0; color: #1c1917;">Información de Entrega</h3>
        <p style="margin: 5px 0;"><strong>Dirección:</strong> ${data.address}</p>
        <p style="margin: 5px 0;"><strong>Ciudad:</strong> ${data.city}</p>
        <p style="margin: 5px 0;"><strong>Departamento:</strong> ${data.department}</p>
      </div>
    `
    : `
      <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-left: 4px solid #f5a438;">
        <h3 style="margin: 0 0 10px 0; color: #1c1917;">📍 Recogida en Tienda</h3>
        <p style="margin: 5px 0;">Tu pedido estará listo para recoger en <strong>24 horas</strong>.</p>
        <p style="margin: 10px 0 5px 0;"><strong>Dirección:</strong> ${storeAddress}</p>
        <p style="margin: 5px 0;"><strong>Ciudad:</strong> ${storeCity}</p>
        <p style="margin: 5px 0;"><strong>Horario de atención:</strong> ${storeHours}</p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #78716c;">
          Recuerda traer tu número de pedido al momento de recoger.
        </p>
      </div>
    `;

  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e7e5e4;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e7e5e4; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e7e5e4; text-align: right;">$${item.price.toLocaleString('es-CO')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e7e5e4; text-align: right; font-weight: 600;">$${item.total.toLocaleString('es-CO')}</td>
    </tr>
  `).join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafaf9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${businessName}</h1>
      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">✅ Pago aprobado</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <h2 style="margin: 0 0 20px 0; color: #1c1917; font-size: 24px;">¡Tu pedido fue registrado con pago exitoso!</h2>

      <p style="margin: 0 0 10px 0; color: #44403c; font-size: 16px;">Hola ${data.customerName},</p>
      <p style="margin: 0 0 20px 0; color: #44403c; font-size: 16px;">
        Tu pago fue aprobado y tu pedido <strong style="color: #3b82f6;">#${data.orderNumber}</strong> ha sido confirmado. ¡Ya lo estamos preparando!
      </p>

      <!-- Order Items -->
      <table style="width: 100%; border-collapse: collapse; margin: 30px 0;">
        <thead>
          <tr style="background-color: #f5f5f4;">
            <th style="padding: 12px; text-align: left; color: #1c1917; font-weight: 600;">Producto</th>
            <th style="padding: 12px; text-align: center; color: #1c1917; font-weight: 600;">Cant.</th>
            <th style="padding: 12px; text-align: right; color: #1c1917; font-weight: 600;">Precio</th>
            <th style="padding: 12px; text-align: right; color: #1c1917; font-weight: 600;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f4; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #44403c;">Subtotal:</span>
          <span style="color: #1c1917; font-weight: 600;">$${data.subtotal.toLocaleString('es-CO')}</span>
        </div>
        ${data.deliveryCost > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #44403c;">Envío:</span>
          <span style="color: #1c1917; font-weight: 600;">$${data.deliveryCost.toLocaleString('es-CO')}</span>
        </div>
        ` : ''}
        ${data.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: #44403c;">Descuento:</span>
          <span style="color: #16a34a; font-weight: 600;">-$${data.discount.toLocaleString('es-CO')}</span>
        </div>
        ` : ''}
        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #d6d3d1; display: flex; justify-content: space-between;">
          <span style="color: #1c1917; font-size: 18px; font-weight: 700;">Total:</span>
          <span style="color: #f5a438; font-size: 20px; font-weight: 700;">$${data.total.toLocaleString('es-CO')} COP</span>
        </div>
      </div>

      ${deliveryInfo}

      <div style="margin-top: 40px; padding: 20px; background-color: #fef3e8; border-radius: 8px; border-left: 4px solid #f5a438;">
        <p style="margin: 0 0 10px 0; color: #1c1917; font-weight: 600;">¿Necesitas ayuda?</p>
        <p style="margin: 0; color: #44403c;">
          Contáctanos: <a href="mailto:${businessEmail}" style="color: #f5a438; text-decoration: none;">${businessEmail}</a><br>
          Teléfono: <a href="tel:${businessPhone}" style="color: #f5a438; text-decoration: none;">${businessPhone}</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f4; padding: 30px 20px; text-align: center;">
      <p style="margin: 0; color: #78716c; font-size: 14px;">
        © ${new Date().getFullYear()} ${businessName}. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || `${businessName} <onboarding@resend.dev>`,
      to: [data.customerEmail],
      subject: `✅ Pedido confirmado #${data.orderNumber} — Pago exitoso`,
      html: htmlContent,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data: emailData };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export async function sendPaymentFailedEmail(data: PaymentFailedEmailData) {
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Tu Tienda';
  const businessEmail = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'contact@yourstore.com';
  const businessPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+57 300 123 4567';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafaf9;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${businessName}</h1>
      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">❌ Pago no procesado</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <h2 style="margin: 0 0 20px 0; color: #1c1917; font-size: 24px;">Tu pago no se pudo procesar</h2>

      <p style="margin: 0 0 10px 0; color: #44403c; font-size: 16px;">Hola ${data.customerName},</p>
      <p style="margin: 0 0 20px 0; color: #44403c; font-size: 16px;">
        Lamentablemente tu pago para el pedido <strong style="color: #ef4444;">#${data.orderNumber}</strong> no fue aprobado.
        <strong>Tu pedido no fue realizado</strong> y no se hizo ningún cargo.
      </p>

      <div style="margin: 30px 0; padding: 20px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px;">¿Qué puedes hacer?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #44403c; font-size: 15px; line-height: 1.8;">
          <li>Verifica que tu método de pago tenga fondos suficientes</li>
          <li>Intenta de nuevo con otro método de pago</li>
          <li>Contacta a tu banco si el problema persiste</li>
        </ul>
      </div>

      <div style="margin-top: 30px; padding: 20px; background-color: #fef3e8; border-radius: 8px; border-left: 4px solid #f5a438;">
        <p style="margin: 0 0 10px 0; color: #1c1917; font-weight: 600;">¿Necesitas ayuda?</p>
        <p style="margin: 0; color: #44403c;">
          Contáctanos: <a href="mailto:${businessEmail}" style="color: #f5a438; text-decoration: none;">${businessEmail}</a><br>
          Teléfono: <a href="tel:${businessPhone}" style="color: #f5a438; text-decoration: none;">${businessPhone}</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f4; padding: 30px 20px; text-align: center;">
      <p style="margin: 0; color: #78716c; font-size: 14px;">
        © ${new Date().getFullYear()} ${businessName}. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || `${businessName} <onboarding@resend.dev>`,
      to: [data.customerEmail],
      subject: `❌ Tu pago no fue procesado — Pedido #${data.orderNumber}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Error sending payment failed email:', error);
      return { success: false, error };
    }

    return { success: true, data: emailData };
  } catch (error) {
    console.error('Error sending payment failed email:', error);
    return { success: false, error };
  }
}
