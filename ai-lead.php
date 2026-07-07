<?php
declare(strict_types=1);

mb_language('Japanese');
mb_internal_encoding('UTF-8');

header('Content-Type: application/json; charset=UTF-8');

$recipient = 'hamura@apple-world.co.jp';
$from = 'noreply@minnano-kuruma.com';

$fields = [
    'car'     => '車種',
    'color'   => 'ボディカラー',
    'year'    => '年式',
    'mileage' => '走行距離',
    'shaken'  => '車検有効期限',
    'repair'  => '修復歴',
    'timing'  => '売却希望時期',
    'name'    => 'お名前',
    'phone'   => '電話番号',
];

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

function respond(bool $ok, string $message = ''): void
{
    http_response_code($ok ? 200 : 400);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'invalid method');
}

$data = [];
foreach ($fields as $key => $label) {
    $data[$key] = clean_field($key);
}

if ($data['car'] === '' || $data['name'] === '') {
    respond(false, '必須項目が入力されていません。');
}

$subject = '【AI査定相談】新しい相談がありました';
$lines = ['AI査定相談チャットからお問い合わせがありました。', ''];
foreach ($fields as $key => $label) {
    $lines[] = $label . ': ' . ($data[$key] !== '' ? $data[$key] : '未入力');
}
$lines[] = '';
$lines[] = '送信日時: ' . date('Y-m-d H:i:s');
$lines[] = '送信元IP: ' . ($_SERVER['REMOTE_ADDR'] ?? '');
$body = implode("\n", $lines);

$headers = [
    'From: ' . $from,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP/' . phpversion(),
];

$sent = mb_send_mail($recipient, $subject, $body, implode("\r\n", $headers), '-f ' . $from);

if (!$sent) {
    respond(false, 'メール送信に失敗しました。');
}

respond(true);
