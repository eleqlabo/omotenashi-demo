const GEMINI_MODEL = 'gemini-2.5-flash';

const LANG_MAP = {
  ja: { label: '日本語', instruction: '日本語でメッセージを生成してください。' },
  en: { label: 'English', instruction: 'Generate the LINE message in English.' },
  zh: { label: '中文', instruction: '请用中文（简体字）生成消息。' },
  ko: { label: '한국어', instruction: '메시지를 한국어로 작성해 주세요.' },
};

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'APIキーが設定されていません。VercelのEnvironment VariablesにGEMINI_API_KEYを設定してください。' });
  }

  const { segment, purpose, tone, extra, language } = req.body || {};

  if (!purpose) {
    return res.status(400).json({ error: 'purpose は必須です。' });
  }

  const lang = LANG_MAP[language] || LANG_MAP['ja'];

  const prompt = `あなたは高級ホテル「プレミアムホテル東京」のマーケティング担当です。
LINEで配信するメッセージを生成してください。

【出力言語の指示】${lang.instruction}

【配信対象セグメント】${segment || '全顧客'}
【配信目的・プラン】${purpose}
【トーン】${tone || '丁寧・格調'}
【追加情報】${extra || 'なし'}

【文体のルール】
- 現代的で読みやすい自然な表現を使うこと
- 古風・過剰な敬語は使わない

【要件】
- 最大500文字以内で、必ず文章を最後まで完結させること
- LINEらしい改行・絵文字を適切に使用
- ホテル名「プレミアムホテル東京」（英語表記: Premium Hotel Tokyo）を適切に使用
- 予約URLは「https://omotenashi-cloud.jp/reserve」を使用
- メッセージ本文のみを出力し、余計な説明は不要`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const raw = await response.text();
      let message = '不明なエラーが発生しました。';
      try { message = JSON.parse(raw).error?.message || message; } catch (_) { message = raw.substring(0, 200); }
      console.error('Gemini API error:', message);
      return res.status(response.status).json({ error: `Gemini APIエラー: ${message}` });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'AIからの応答が空でした。再度お試しください。' });
    }

    res.json({ text });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました。しばらくしてから再度お試しください。' });
  }
};
