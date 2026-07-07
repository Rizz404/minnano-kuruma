<?php
declare(strict_types=1);

mb_language('Japanese');
mb_internal_encoding('UTF-8');

$recipient = 'hamura@apple-world.co.jp';
$from = 'noreply@minnano-kuruma.com';
$successUrl = 'thanks.html';

function clean_field(string $key): string
{
    $value = $_POST[$key] ?? '';
    if (is_array($value)) {
        $value = implode(', ', $value);
    }
    $value = trim((string) $value);
    $value = str_replace(["\r", "\0"], '', $value);
    return $value;
}

function render_error(string $message): void
{
    http_response_code(400);
    $safeMessage = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>送信エラー｜アップルワールド羽村店</title><link rel="stylesheet" href="assets/css/style.css"><style>.mail-result{min-height:100vh;display:grid;place-items:center;padding:40px 18px;background:#f5f5f5}.mail-result__box{max-width:640px;background:#fff;border:1px solid #e3e3e3;border-radius:14px;padding:34px 24px;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.08)}.mail-result__title{font-size:1.6rem;font-weight:900;color:#ff004d;margin-bottom:12px}.mail-result__text{margin-bottom:22px}.mail-result__link{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#ff004d;color:#fff;font-weight:700;padding:13px 24px}</style></head><body><main class="mail-result"><div class="mail-result__box"><h1 class="mail-result__title">送信できませんでした</h1><p class="mail-result__text">' . $safeMessage . '</p><a class="mail-result__link" href="./#form">フォームへ戻る</a></div></main></body></html>';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ./#form', true, 303);
    exit;
}

if (clean_field('website') !== '') {
    header('Location: ' . $successUrl, true, 303);
    exit;
}

$name = clean_field('name');
$tel = clean_field('tel');
$email = clean_field('email');
$car = clean_field('car');
$area = clean_field('area');
$message = clean_field('message');
$agree = isset($_POST['agree']) ? '同意済み' : '未同意';

if ($name === '' || $email === '') {
    render_error('必須項目を入力してください。');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    render_error('メールアドレスの形式をご確認ください。');
}

$subject = '【無料査定】お問い合わせがありました';
$body = implode("\n", [
    'アップルワールド羽村店のWebサイトからお問い合わせがありました。',
    '',
    'お名前: ' . $name,
    'メールアドレス: ' . $email,
    '電話番号: ' . ($tel !== '' ? $tel : '未入力'),
    '車種・メーカー: ' . ($car !== '' ? $car : '未入力'),
    'お住まいのエリア: ' . ($area !== '' ? $area : '未入力'),
    'ご相談内容:',
    $message !== '' ? $message : '未入力',
    '',
    'プライバシーポリシー: ' . $agree,
    '送信日時: ' . date('Y-m-d H:i:s'),
    '送信元IP: ' . ($_SERVER['REMOTE_ADDR'] ?? ''),
]);

$headers = [
    'From: ' . $from,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP/' . phpversion(),
];

if ($email !== '') {
    $headers[] = 'Reply-To: ' . $email;
}

$sent = mb_send_mail($recipient, $subject, $body, implode("\r\n", $headers), '-f ' . $from);

if (!$sent) {
    render_error('時間をおいて再度お試しください。お急ぎの場合はお電話でお問い合わせください。');
}

header('Location: ' . $successUrl, true, 303);
exit;
