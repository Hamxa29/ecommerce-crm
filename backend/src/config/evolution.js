import axios from 'axios';
import { normalizePhone } from '../utils/phoneNormalizer.js';

const evo = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: { apikey: process.env.EVOLUTION_API_KEY },
  timeout: 15000,
});

export async function sendText(instanceName, phone, message) {
  const { data } = await evo.post(`/message/sendText/${instanceName}`, {
    number: normalizePhone(phone).replace('+', ''),
    text: message,
  });
  return data;
}

export async function sendMedia(instanceName, phone, message, mediaUrl, mediaType = 'image') {
  const mimeMap = {
    image: 'image/jpeg',
    video: 'video/mp4',
    document: 'application/pdf',
  };
  const { data } = await evo.post(`/message/sendMedia/${instanceName}`, {
    number: normalizePhone(phone).replace('+', ''),
    mediatype: mediaType,
    mimetype: mimeMap[mediaType] ?? 'application/octet-stream',
    caption: message,
    media: mediaUrl,
  });
  return data;
}

export async function getConnectionState(instanceName) {
  const { data } = await evo.get(`/instance/connectionState/${instanceName}`);
  return data.instance?.state ?? 'close';
}

export async function getQRCode(instanceName) {
  const { data } = await evo.get(`/instance/connect/${instanceName}`);
  return data;
}

export async function createInstance(instanceName) {
  const { data } = await evo.post('/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'EVOLUTION',
  });
  return data;
}

export async function logoutInstance(instanceName) {
  const { data } = await evo.delete(`/instance/logout/${instanceName}`);
  return data;
}

export async function checkWhatsappNumber(instanceName, phone) {
  try {
    const { data } = await evo.post(`/chat/whatsappNumbers/${instanceName}`, {
      numbers: [normalizePhone(phone)],
    });
    return data?.[0]?.exists ?? false;
  } catch {
    return false; // if check fails, don't send to avoid spamming non-WA numbers
  }
}
