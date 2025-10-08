// server.js — texto, imagem, chat com histórico, STT e TTS com Gemini

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { genai } from './gemini-client.js';

const app = express();

// CORS (em produção, fixe origin)
app.use(cors({ origin: process.env.WEB_ORIGIN || '*', methods: ['POST', 'OPTIONS'] }));

// Rate limit básico
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(limiter);

app.use(express.json({ limit: '10mb' }));

// ===== Uploads =====
const uploadImage = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if ((file.mimetype || '').startsWith('image/')) cb(null, true);
    else cb(new Error('Envie uma imagem válida (png, jpeg, etc.)'));
  },
});

const uploadAudio = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok =
      (file.mimetype || '').startsWith('audio/') ||
      file.mimetype === 'video/webm';
    if (ok) cb(null, true);
    else cb(new Error('Envie um áudio válido.'));
  },
});

// ===== Util: PCM16 -> WAV (24 kHz mono) =====
function pcm16ToWav(pcmBuf, { sampleRate = 24000, channels = 1 } = {}) {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBuf.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(16, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuf.length, 40);
  return Buffer.concat([wavHeader, pcmBuf]);
}

// ---------- ROTA: texto ----------
app.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
    }
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const resp = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const replyText = resp.response.text();
    return res.json({ reply: replyText });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// ---------- ROTA: imagem + texto ----------
app.post('/chat-image', uploadImage.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'Campo "image" é obrigatório' });
    }

    const imgPath = path.resolve(req.file.path);
    const imgBuf = await fs.readFile(imgPath);
    const mimeType = req.file.mimetype;
    await fs.unlink(imgPath).catch(() => {});

    const contents = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imgBuf.toString('base64') } },
          { text: prompt || '' },
        ],
      },
    ];

    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const resp = await model.generateContent({ contents });
    const replyText = resp.response.text();
    return res.json({ reply: replyText });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// ---------- ROTA: chat com histórico ----------
app.post('/chat-converse', async (req, res) => {
  try {
    const { messages, system } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] é obrigatório' });
    }

    const model = genai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      // Se sua versão do SDK não suportar, remova e injete via primeira mensagem.
      systemInstruction: system || 'Você é um assistente sucinto e útil. Responda em pt-BR.',
    });

    const contents = messages.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

    const resp = await model.generateContent({ contents });
    const reply = resp.response.text() || '';

    return res.json({ reply });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// ---------- ROTA: STT ----------
app.post('/stt', uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Campo "audio" é obrigatório' });

    const audioPath = path.resolve(req.file.path);
    const audioBuf = await fs.readFile(audioPath);
    const mimeType = req.file.mimetype || 'audio/wav';
    await fs.unlink(audioPath).catch(() => {});

    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = 'Transcreva o áudio em pt-BR. Saída: texto puro, sem comentários.';

    const resp = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: audioBuf.toString('base64') } },
          { text: prompt }
        ]
      }]
    });

    const text = resp.response.text() || '';
    return res.json({ text });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// ---------- ROTA: TTS ----------
app.post('/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore' } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Campo "text" é obrigatório' });
    }

    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
        }
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      return res.status(500).json({ error: `TTS HTTP ${r.status}: ${errText}` });
    }

    const json = await r.json();
    const b64pcm = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64pcm) return res.status(500).json({ error: 'Resposta TTS sem áudio.' });

    const pcmBuf = Buffer.from(b64pcm, 'base64');
    const wavBuf = pcm16ToWav(pcmBuf, { sampleRate: 24000, channels: 1 });
    const audioBase64 = wavBuf.toString('base64');

    return res.json({ audioBase64, mimeType: 'audio/wav' });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
