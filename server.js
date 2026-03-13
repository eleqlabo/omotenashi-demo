require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

app.post('/api/generate', async (req, res) => {
  const { type, params } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  let prompt = '';

  if (type === 'review') {
    const { platform, rating, reviewText, tone, reviewerName } = params;
    const nameLabel = reviewerName || 'お客様';
    prompt = `あなたは高級ホテル「プレミアムホテル東京」のカスタマーサービス担当です。
以下のお客様の口コミに対して、ホテルとしての丁寧な返信文を日本語で生成してください。

【投稿者名】${nameLabel}
【プラットフォーム】${platform}
【評価】${rating}星 / 5星
【口コミ内容】
${reviewText}

【返信トーン】${tone}

【要件】
- 返信文の冒頭は必ず「${nameLabel}」という呼びかけで始めること（例：「${nameLabel}、この度は...」）
- ホテル名「プレミアムホテル東京」を使用
- 署名は「プレミアムホテル東京 スタッフ一同」
- 評価が低い場合は誠実にお詫びし改善への意欲を示す
- 評価が高い場合はお礼とまたのご来館への期待を伝える
- 返信文のみを出力し、余計な説明は不要`;

  } else if (type === 'line') {
    const { segment, purpose, tone, extra } = params;
    prompt = `あなたは高級ホテル「プレミアムホテル東京」のマーケティング担当です。
LINEで配信するメッセージを日本語で生成してください。

【配信対象セグメント】${segment}
【配信目的・プラン】${purpose}
【トーン】${tone}
【追加情報】${extra || 'なし'}

【要件】
- 最大500文字以内
- LINEらしい改行・絵文字を適切に使用
- ホテル名「プレミアムホテル東京」を使用
- 予約URLは「https://omotenashi-cloud.jp/reserve」を使用
- メッセージ本文のみを出力し、余計な説明は不要`;
  } else {
    return res.status(400).json({ error: '不正なリクエストタイプです。' });
  }

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Gemini API error:', errData);
      return res.status(response.status).json({
        error: `Gemini APIエラー: ${errData.error?.message || '不明なエラーが発生しました。'}`
      });
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
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
