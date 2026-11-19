/**
 * INTERVIX AI - Audio Transcription Service
 * Transcribes candidate speech audio (WebM, WAV, MP4, OGG) using Gemini Multimodal Audio
 * or OpenAI Whisper, with robust fallback.
 */

async function transcribeAudioBuffer(buffer, mimeType = 'audio/webm') {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty audio buffer received. Please check microphone recording.');
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // Clean mimeType
  let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!cleanMime || cleanMime === 'application/octet-stream') {
    cleanMime = 'audio/webm';
  }

  // 1. Try Google Gemini Multimodal Audio Transcription
  if (geminiKey && geminiKey.trim()) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`;
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
                text: 'You are an accurate Speech-to-Text transcription engine for technical interviews. Transcribe the spoken audio word-for-word. Return ONLY the transcribed text without any conversational preamble, notes, or explanations.',
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
          return {
            transcript: transcriptText.trim(),
            provider: 'gemini_multimodal_audio',
            success: true,
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`[Gemini Audio Transcription HTTP ${response.status}]:`, errText.slice(0, 200));
      }
    } catch (err) {
      console.warn('[Gemini Audio Transcription Error]:', err.message);
    }
  }

  // 2. Try OpenAI Whisper Audio Transcription
  if (openAiKey && openAiKey.trim()) {
    try {
      const ext = cleanMime.includes('webm') ? 'webm' : cleanMime.includes('ogg') ? 'ogg' : cleanMime.includes('mp4') ? 'mp4' : 'wav';
      const file = new File([buffer], `candidate_audio.${ext}`, { type: cleanMime });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey.trim()}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && data.text.trim()) {
          return {
            transcript: data.text.trim(),
            provider: 'openai_whisper',
            success: true,
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`[OpenAI Whisper HTTP ${response.status}]:`, errText.slice(0, 200));
      }
    } catch (err) {
      console.warn('[OpenAI Whisper Error]:', err.message);
    }
  }

  // Fallback if no LLM key or network failed
  return {
    transcript: '',
    provider: 'browser_stt_primary',
    success: false,
    message: 'Audio captured. Please ensure browser SpeechRecognition is allowed or provide text fallback.',
  };
}

module.exports = {
  transcribeAudioBuffer,
};
