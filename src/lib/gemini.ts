import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function chatWithGemini(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'model'; text: string }>,
  userMessage: string
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `INSTRUCCIONES DEL SISTEMA: ${systemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Entendido. Seguiré estas instrucciones.' }] },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.text }],
      })),
    ],
  });

  const result = await chat.sendMessage(userMessage);
  const response = result.response.text();

  return response;
}
