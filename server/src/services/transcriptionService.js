/**
 * INTERVIX AI - Audio Transcription Service
 *
 * Transcribes candidate speech audio (WebM, WAV, MP4, OGG) using:
 *   1. Google Gemini Multimodal Audio (primary — inline base64)
 *   2. OpenAI Whisper (secondary — form-data upload)
 *   3. Graceful fallback with clear error message when no key is configured
 *
 * Required env vars (at least one):
 *   GEMINI_API_KEY   — Google AI Studio key
 *   OPENAI_API_KEY   — OpenAI key
 */

const FormData = require('form-data');

async function transcribeAudioBuffer(buffer, mimeType = 'audio/webm') {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty audio buffer received. Please check microphone recording.');
  }

  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY || '').trim();

  // Normalize MIME type
  let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!cleanMime || cleanMime === 'application/octet-stream') {
    cleanMime = 'audio/webm';
  }

  console.log(
    `[Transcription] Buffer: ${buffer.length} bytes | MIME: ${cleanMime} | Gemini: ${geminiKey ? 'yes' : 'no'} | OpenAI: ${openAiKey ? 'yes' : 'no'}`
  );

  // -------------------------------------------------------
  // 1. Google Gemini Multimodal Audio (inline base64 upload)
  // -------------------------------------------------------
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const base64Audio = buffer.toString('base64');

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: base64Audio,
                },
              },
              {
                text: 'You are a highly accurate Speech-to-Text transcription engine for technical job interviews. Transcribe the spoken audio exactly, word-for-word. Output ONLY the transcribed text with no preamble, commentary, or explanation.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const transcriptText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (transcriptText && transcriptText.trim()) {
          console.log('[Transcription] Gemini success:', transcriptText.slice(0, 80));
          return {
            transcript: transcriptText.trim(),
            provider: 'gemini_multimodal_audio',
            success: true,
          };
        } else {
          console.warn('[Transcription] Gemini returned empty transcript.');
        }
      } else {
        const errText = await response.text();
        console.warn(`[Transcription] Gemini HTTP ${response.status}:`, errText.slice(0, 300));
      }
    } catch (err) {
      console.error('[Transcription] Gemini error:', err.message);
    }
  }

  // -------------------------------------------------------
  // 2. OpenAI Whisper (multipart file upload)
  //    FIX: Node.js does not have a global `File` constructor.
  //    Use form-data package with a Buffer directly.
  // -------------------------------------------------------
  if (openAiKey) {
    try {
      const ext = cleanMime.includes('ogg')
        ? 'ogg'
        : cleanMime.includes('mp4')
        ? 'mp4'
        : cleanMime.includes('wav')
        ? 'wav'
        : 'webm';

      const formData = new FormData();
      formData.append('file', buffer, {
        filename: `candidate_audio.${ext}`,
        contentType: cleanMime,
        knownLength: buffer.length,
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && data.text.trim()) {
          console.log('[Transcription] OpenAI Whisper success:', data.text.slice(0, 80));
          return {
            transcript: data.text.trim(),
            provider: 'openai_whisper',
            success: true,
          };
        } else {
          console.warn('[Transcription] OpenAI Whisper returned empty text.');
        }
      } else {
        const errText = await response.text();
        console.warn(`[Transcription] OpenAI Whisper HTTP ${response.status}:`, errText.slice(0, 300));
      }
    } catch (err) {
      console.error('[Transcription] OpenAI Whisper error:', err.message);
    }
  }

  // -------------------------------------------------------
  // 3. No API key configured — return clear error message
  //    so the frontend can show it to the candidate
  // -------------------------------------------------------
  const noKeyMsg =
    !geminiKey && !openAiKey
      ? 'No speech-to-text API key is configured on the server. Please add GEMINI_API_KEY or OPENAI_API_KEY to server/.env to enable voice transcription.'
      : 'Speech-to-text provider returned an empty result. Please type your answer manually.';

  console.warn('[Transcription]', noKeyMsg);

  return {
    transcript: '',
    provider: 'none',
    success: false,
    message: noKeyMsg,
  };
}

module.exports = {
  transcribeAudioBuffer,
};
