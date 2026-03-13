const GEMINI_MODEL = 'gemini-2.5-flash';

const LANG_MAP = {
  ja: { subjectKey: '件名', instruction: '件名と本文を日本語で生成してください。' },
  en: { subjectKey: 'Subject', instruction: 'Generate the subject line and email body in English. Use "Subject:" format.' },
  zh: { subjectKey: '主题', instruction: '请用中文（简体字）生成邮件主题和正文。使用「主题:」格式。' },
  ko: { subjectKey: '제목', instruction: '이메일 제목과 본문을 한국어로 작성해 주세요。「제목:」 형식을 사용해 주세요。' },
};

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  const { segment, purpose, tone, extra, language } = req.body || {};

  if (!purpose) {
    return res.status(400).json({ error: 'purpose は必須です。' });
  }

  const lang = LANG_MAP[language] || LANG_MAP['ja'];

  const prompt = `あなたは高級ホテル「プレミアムホテル東京」のマーケティング担当です。
顧客へ一斉配信するメールの件名と本文を生成してください。

【出力言語の指示】${lang.instruction}

【配信対象セグメント】${segment || '全顧客'}
【配信目的・プラン】${purpose}
【トーン】${tone || '丁寧・格調'}
【追加情報】${extra || 'なし'}

【出力形式】必ず以下の形式で出力すること：
${lang.subjectKey}: [件名をここに書く]
===
[メール本文をここに書く]

【本文の要件】
- 自然な書き出しで始める
- 必ず最後まで文章を完結させること
- ホテル名「プレミアムホテル東京」（英語表記: Premium Hotel Tokyo）を適切に使用
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

    // 言語に対応した件名キーでパース（件名: / Subject: / 主题: / 제목:）
    const subjectMatch = text.match(/^(?:件名|Subject|主题|제목)[:：]\s*(.+)/im);
    const subject = subjectMatch ? subjectMatch[1].trim() : purpose;
    const body = text.replace(/^(?:件名|Subject|主题|제목)[:：]\s*.+\n?={3,}\n?/im, '').trim();

    res.json({ subject, body });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
};
