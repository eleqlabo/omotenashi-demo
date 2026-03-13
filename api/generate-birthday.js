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

  const { customerName, rank, coupon, couponExpiry } = req.body || {};

  if (!customerName) {
    return res.status(400).json({ error: 'customerName は必須です。' });
  }

  const couponText = coupon || '次回宿泊10%OFF';
  const expiryText = couponExpiry || 'お誕生月末まで';

  const prompt = `あなたは高級ホテル「プレミアムホテル東京」のスタッフです。
お客様のお誕生日に送るLINEメッセージを日本語で生成してください。

【お客様名】${customerName}
【会員ランク】${rank || 'NORMAL'}
【特典内容】${couponText}
【特典有効期限】${expiryText}

【文体のルール】
- 現代的で読みやすい丁寧語を使う
- 「ごきげんよう」などの古風な表現は使わない
- 温かみのある自然なお祝いの言葉にする

【要件】
- 400文字以内で、必ず最後まで文章を完結させること
- 冒頭で${customerName}さんへの誕生日のお祝いを伝える
- 特典（${couponText}）と有効期限（${expiryText}）を明記する
- 予約URLは「https://omotenashi-cloud.jp/reserve」を含める
- LINEらしい絵文字（🎂🎉🎁など）を適度に使用
- メッセージ本文のみ出力し、余計な説明は不要`;

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
