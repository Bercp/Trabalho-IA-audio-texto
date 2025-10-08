import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY não definido');
}

export const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
