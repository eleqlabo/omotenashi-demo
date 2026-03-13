const GEMINI_MODEL = 'gemini-2.5-flash';

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  const { segment, purpose, tone, extra } = req.body || {};

  if (!purpose) {
    return res.status(400).json({ error: 'purpose は必須です。' });
  }

  const prompt = `あなたは高級ホテル「プレミアムホテル東京」のマーケティング担当です。
顧客へ一斉配信するHTMLメールの件名と本文を日本語で生成してください。

【配信対象セグメント】${segment || '全顧客'}
【配信目的・プラン】${purpose}
【トーン】${tone || '丁寧・格調'}
【追加情報】${extra || 'なし'}

【文体のルール】
- 現代的で読みやすい丁寧語を使う
- 「ごきげんよう」などの古風な表現は使わない
- メールらしい丁寧な書き出しにする

【出力形式】必ず以下の形式で出力すること：
件名: [件名をここに書く]
===
[メール本文をここに書く]

【本文の要件】
- 書き出しは「いつもプレミアムホテル東京をご利用いただきありがとうございます。」
- 必ず最後まで文章を完結させること
- ホテル名「プレミアムホテル東京」を使用
- 予約URLは「https://omotenashi-cloud.jp/reserve」を含める
- 本文のみ出力し、余計な説明は不要`;

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
      return res.status(response.status).json({ error: `Gemini APIエラー: ${message}` });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'AIからの応答が空でした。再度お試しください。' });
    }

    // 件名と本文をパース
    const subjectMatch = text.match(/^件名[:：]\s*(.+)/m);
    const subject = subjectMatch ? subjectMatch[1].trim() : purpose;
    const body = text.replace(/^件名[:：]\s*.+\n?={3,}\n?/m, '').trim();

    res.json({ subject, body });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
};
