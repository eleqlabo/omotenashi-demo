/**
 * 誕生日自動送信 Cronジョブ
 * vercel.json の crons で毎日 09:00 JST (00:00 UTC) に実行
 *
 * 本番運用では以下を実装してください：
 * 1. DBから当日誕生日の顧客を取得
 * 2. 各顧客に /api/generate-birthday でメッセージ生成
 * 3. LINE Messaging API で実際に送信
 * 4. 送信ログをDBに記録
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel cronからのリクエストのみ許可
  const cronSecret = req.headers['authorization'];
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  const todayMD = `${mm}-${dd}`;

  console.log(`[birthday-cron] 実行日: ${todayMD}`);

  // TODO: 実際の運用ではDBから当日誕生日の顧客を取得する
  // const customers = await db.query('SELECT * FROM customers WHERE birthday_md = ?', [todayMD]);

  // デモ用：処理フローのログのみ記録
  console.log(`[birthday-cron] ${todayMD} の誕生日顧客をチェックしました`);

  res.json({
    ok: true,
    date: todayMD,
    message: `誕生日チェック完了。実際の送信にはLINE Messaging APIの連携が必要です。`,
  });
};
