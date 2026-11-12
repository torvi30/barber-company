/**
 * BarberPulse OS - WhatsApp Cloud API Service (Meta Business Platform)
 * 
 * Gestiona el envío de mensajes de texto y plantillas oficiales de WhatsApp Business
 * para confirmaciones de citas, recordatorios automáticos y fichas de seguimiento.
 */

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

/**
 * Normaliza y valida números de teléfono en formato E.164
 * Remueve signos +, espacios, guiones y paréntesis
 */
export const normalizePhoneNumber = (rawPhone) => {
  if (!rawPhone) return '';
  const cleaned = rawPhone.toString().replace(/[^\d]/g, '');
  // Si no tiene código de país y parece número de 10 dígitos (México/Colombia/EEUU común), se puede asumir o dejar limpio
  return cleaned;
};

/**
 * Verifica si las credenciales de Meta WhatsApp Cloud API están activas
 */
export const isWhatsAppConfigured = () => {
  return (
    Boolean(WHATSAPP_TOKEN) &&
    !WHATSAPP_TOKEN.includes('Mock') &&
    Boolean(WHATSAPP_PHONE_ID) &&
    !WHATSAPP_PHONE_ID.includes('Mock')
  );
};

/**
 * Enviar mensaje de texto libre mediante la API oficial de WhatsApp Cloud
 * (Válido dentro de la ventana de 24h de conversación o número de prueba)
 */
export const sendWhatsAppText = async ({ to, message, tenantId = 'global' }) => {
  const recipient = normalizePhoneNumber(to);
  if (!recipient) {
    throw new Error('Número de teléfono destino inválido o vacío');
  }

  // Si no hay credenciales reales de Meta en el entorno, operamos en modo simulador enterprise
  if (!isWhatsAppConfigured()) {
    const mockMessageId = `mock_wamid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log(`\n📱 [WhatsApp Cloud API - SIMULADOR | Tenant: ${tenantId}]`);
    console.log(`➡️  Para: +${recipient}`);
    console.log(`💬  Mensaje:\n${message}`);
    console.log(`✅  ID de mensaje generado: ${mockMessageId}\n`);
    
    return {
      success: true,
      simulated: true,
      messageId: mockMessageId,
      recipient,
      timestamp: new Date().toISOString()
    };
  }

  // Enviar a la API oficial de Meta Graph
  const endpoint = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      preview_url: false,
      body: message
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [WhatsApp API Error]:', data);
      throw new Error(data.error?.message || 'Error en comunicación con Meta WhatsApp Cloud API');
    }

    const messageId = data.messages?.[0]?.id || 'unknown';
    console.log(`✅ [WhatsApp API Real] Mensaje enviado a +${recipient}. MessageId: ${messageId}`);

    return {
      success: true,
      simulated: false,
      messageId,
      recipient,
      data
    };
  } catch (error) {
    console.error('💥 [WhatsApp Service Exception]:', error.message);
    throw error;
  }
};

/**
 * Envío de plantilla oficial de recordatorio de cita (Ventana de 2 Horas)
 * Diseñado según lineamientos de Meta Business para "appointment_reminder"
 */
export const sendAppointmentReminderWhatsApp = async ({
  to,
  clientName,
  barberName,
  serviceName,
  time,
  date,
  barbershopName = 'BarberPulse VIP'
}) => {
  const formattedTime = time || 'su hora reservada';
  const textMessage = 
`💈 *RECORDATORIO DE TURNO - ${barbershopName.toUpperCase()}* 💈

Hola *${clientName}*, ¡todo listo para tu corte! 🔥
Te recordamos que tu cita está programada para hoy:

✂️ *Servicio:* ${serviceName}
💈 *Barbero:* ${barberName}
⏰ *Hora:* ${formattedTime}

📍 Por favor llega 5-10 minutos antes para recibirte con una bebida de cortesía.
Si necesitas reprogramar, infórmanos con anticipación respondiendo a este mensaje.

¡Nos vemos en la silla! 💈`;

  return sendWhatsAppText({
    to,
    message: textMessage,
    tenantId: barbershopName
  });
};

/**
 * Envío de confirmación inmediata al agendar turno
 */
export const sendBookingConfirmationWhatsApp = async ({
  to,
  clientName,
  barberName,
  serviceName,
  time,
  date,
  barbershopName = 'BarberPulse'
}) => {
  const textMessage = 
`✨ *CITA CONFIRMADA - ${barbershopName.toUpperCase()}*

Hola *${clientName}*, tu turno ha sido reservado con éxito:

📅 *Fecha:* ${date}
⏰ *Hora:* ${time}
✂️ *Servicio:* ${serviceName}
💈 *Barbero Asignado:* ${barberName}

Recibirás un recordatorio automático 2 horas antes de tu turno.
¡Gracias por confiar en el mejor estilo! 💈`;

  return sendWhatsAppText({
    to,
    message: textMessage,
    tenantId: barbershopName
  });
};

export default {
  sendWhatsAppText,
  sendAppointmentReminderWhatsApp,
  sendBookingConfirmationWhatsApp,
  normalizePhoneNumber,
  isWhatsAppConfigured
};

