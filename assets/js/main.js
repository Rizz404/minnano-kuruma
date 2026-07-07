/* =========================================================
   アップルワールド羽村店 LP - インタラクション
   - FAQ アコーディオン
   - スクロール追従CTA（ファーストビューを過ぎたら表示）
   ========================================================= */
(function () {
  'use strict';

  /* ---- FAQ アコーディオン ---- */
  var faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(function (item) {
    var btn = item.querySelector('.faq__q');
    var ans = item.querySelector('.faq__a');
    if (!btn || !ans) return;

    btn.addEventListener('click', function () {
      var isOpen = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      ans.style.maxHeight = isOpen ? ans.scrollHeight + 'px' : '0';
    });
  });

  // ウィンドウ幅変更時、開いているFAQの高さを再計算
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll('.faq__item.is-open .faq__a').forEach(function (ans) {
        ans.style.maxHeight = ans.scrollHeight + 'px';
      });
    }, 150);
  });

  /* ---- メールアドレスの必須メッセージ ---- */
  var emailInput = document.getElementById('f-email');
  if (emailInput) {
    var emailRequiredMessage = 'メールアドレスを入力してください';

    emailInput.addEventListener('invalid', function () {
      if (!emailInput.value.trim()) {
        emailInput.setCustomValidity(emailRequiredMessage);
      }
    });

    emailInput.addEventListener('input', function () {
      emailInput.setCustomValidity('');
    });
  }

  /* ---- 口コミ全文モーダル ---- */
  var reviewModal = document.getElementById('review-modal');
  var lastReviewButton = null;

  if (reviewModal) {
    var reviewModalTitle = reviewModal.querySelector('.review-modal__title');
    var reviewModalBody = reviewModal.querySelector('.review-modal__body');
    var reviewModalClose = reviewModal.querySelector('.review-modal__close');

    function openReviewModal(card, button) {
      var name = card.querySelector('.review__name');
      var full = card.querySelector('.review__full');
      if (!name || !full || !reviewModalTitle || !reviewModalBody) return;

      lastReviewButton = button;
      reviewModalTitle.textContent = name.childNodes[0].textContent.trim();
      reviewModalBody.innerHTML = full.innerHTML;
      reviewModal.classList.add('is-open');
      reviewModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (reviewModalClose) reviewModalClose.focus();
    }

    function closeReviewModal() {
      reviewModal.classList.remove('is-open');
      reviewModal.setAttribute('aria-hidden', 'true');
      reviewModalBody.innerHTML = '';
      document.body.style.overflow = '';
      if (lastReviewButton) lastReviewButton.focus();
    }

    document.querySelectorAll('[data-review-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        var card = button.closest('.review__card');
        if (card) openReviewModal(card, button);
      });
    });

    reviewModal.querySelectorAll('[data-review-close]').forEach(function (button) {
      button.addEventListener('click', closeReviewModal);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && reviewModal.classList.contains('is-open')) {
        closeReviewModal();
      }
    });
  }

  /* ---- スクロール追従CTA ---- */
  var floating = document.getElementById('floating');
  var hero = document.getElementById('hero');

  if (floating && hero && 'IntersectionObserver' in window) {
    // ファーストビューが画面外に出たら追従CTAを表示
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          floating.classList.remove('is-visible');
        } else {
          floating.classList.add('is-visible');
        }
      });
    }, { rootMargin: '-80px 0px 0px 0px' });
    observer.observe(hero);
  } else if (floating) {
    // 非対応環境では常時表示
    floating.classList.add('is-visible');
  }
})();

/* =========================================================
   AI買取相談 Agent
   - 8問の質問フローで相談（査定金額は提示せず店長確認へ誘導）
   - 入力内容を localStorage に保存／管理画面でCSV出力
   ========================================================= */
(function () {
  'use strict';

  var fab = document.getElementById('aiFab');
  var overlay = document.getElementById('aiOverlay');
  var chat = document.getElementById('aiChat');
  var body = document.getElementById('aiBody');
  var inputArea = document.getElementById('aiInputArea');
  var closeBtn = document.getElementById('aiClose');
  var progress = document.getElementById('aiProgress');
  var progressBar = document.getElementById('aiProgressBar');
  if (!fab || !chat || !body) return;

  var LINE_URL = 'https://lin.ee/SWjsV1v';
  var TEL_URL = 'tel:0425334750';
  var STORAGE_KEY = 'aw_ai_leads';

  // 質問フロー定義
  var STEPS = [
    { key: 'car', label: '車種', type: 'text', q: '車種を教えてください。', ex: '例）プリウス / アルファード / ハイエース / N-BOX' },
    { key: 'color', label: 'ボディカラー', type: 'text', q: 'ボディカラーを教えてください。', ex: '例）ホワイト / ブラック / シルバー' },
    { key: 'year', label: '年式', type: 'text', q: '年式を教えてください。', ex: '例）2020年' },
    { key: 'mileage', label: '走行距離', type: 'text', q: '走行距離を教えてください。', ex: '例）50,000km' },
    { key: 'shaken', label: '車検有効期限', type: 'text', q: '車検有効期限を教えてください。', ex: '例）2027年3月 / 車検切れ' },
    { key: 'repair', label: '修復歴', type: 'opt', q: '修復歴はありますか？', opts: ['なし', 'あり'] },
    { key: 'timing', label: '売却希望時期', type: 'opt', q: '売却希望時期を教えてください。', opts: ['すぐ売りたい', '1か月以内', '3か月以内', '未定'] },
    { key: 'name', label: 'お名前', type: 'text', q: 'お名前を教えてください。', ex: '例）山田 太郎' },
    { key: 'phone', label: '電話番号', type: 'text', q: '電話番号を教えてください（任意）。', ex: '例）090-1234-5678', optional: true }
  ];

  var answers = {};
  var step = 0;
  var started = false;

  /* ---- 小さなユーティリティ ---- */
  function scrollBottom() { body.scrollTop = body.scrollHeight; }

  function botMsg(text, exampleText) {
    var el = document.createElement('div');
    el.className = 'ai-msg ai-msg--bot';
    el.textContent = text;
    if (exampleText) {
      var ex = document.createElement('span');
      ex.className = 'ai-msg__ex';
      ex.textContent = exampleText;
      el.appendChild(ex);
    }
    body.appendChild(el);
    scrollBottom();
  }

  function userMsg(text) {
    var el = document.createElement('div');
    el.className = 'ai-msg ai-msg--user';
    el.textContent = text;
    body.appendChild(el);
    scrollBottom();
  }

  function clearInput() { inputArea.innerHTML = ''; }

  function setProgress() {
    progress.hidden = false;
    var pct = Math.round((step / STEPS.length) * 100);
    progressBar.style.width = pct + '%';
  }

  /* ---- フロー制御 ---- */
  function start() {
    answers = {};
    step = 0;
    body.innerHTML = '';
    clearInput();
    botMsg('こんにちは。アップルワールド羽村店のAI無料査定相談です。');
    botMsg('約30秒で簡単に買取相談ができます。まずは車種を教えてください。');
    setTimeout(ask, 450);
  }

  function ask() {
    if (step >= STEPS.length) { finish(); return; }
    setProgress();
    var s = STEPS[step];
    // 最初の質問（車種）は初回メッセージで案内済みのため、質問文の重複表示を省略
    if (step > 0) {
      botMsg('【質問' + (step + 1) + '／' + STEPS.length + '】' + s.q, s.ex);
    }
    if (s.type === 'opt') {
      renderOptions(s);
    } else {
      renderTextInput(s);
    }
  }

  function renderOptions(s) {
    clearInput();
    var wrap = document.createElement('div');
    wrap.className = 'ai-opts';
    s.opts.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ai-opt';
      b.textContent = opt;
      b.addEventListener('click', function () {
        wrap.remove();
        accept(s, opt);
      });
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollBottom();
  }

  function renderTextInput(s) {
    clearInput();
    var row = document.createElement('div');
    row.className = 'ai-inputrow';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = s.ex ? s.ex.replace('例）', '例：') : '入力してください';
    input.setAttribute('aria-label', s.q);
    var send = document.createElement('button');
    send.type = 'button';
    send.className = 'ai-send';
    send.textContent = '送信';
    function submit() {
      var v = input.value.trim();
      if (!v && !s.optional) { input.focus(); return; }
      row.remove();
      accept(s, v);
    }
    send.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    row.appendChild(input);
    row.appendChild(send);
    if (s.optional) {
      var skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'ai-skip';
      skip.textContent = 'スキップ';
      skip.addEventListener('click', function () {
        row.remove();
        accept(s, '', 'スキップ');
      });
      row.appendChild(skip);
    }
    inputArea.appendChild(row);
    input.focus();
  }

  function accept(s, value, displayText) {
    answers[s.key] = value;
    userMsg(displayText != null ? displayText : value);
    step++;
    setProgress();
    setTimeout(ask, 350);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderSummary(a) {
    var box = document.createElement('div');
    box.className = 'ai-summary';
    var html = '<p class="ai-summary__title">ご入力内容の確認</p><dl class="ai-summary__list">';
    STEPS.forEach(function (s) {
      var v = a[s.key];
      html += '<dt>' + escapeHtml(s.label) + '</dt><dd>' + (v ? escapeHtml(v) : '未入力') + '</dd>';
    });
    html += '</dl>';
    box.innerHTML = html;
    body.appendChild(box);
    scrollBottom();
  }

  /* ---- 店舗へメール通知 ---- */
  function sendLeadEmail(a) {
    try {
      var params = new URLSearchParams();
      STEPS.forEach(function (s) { params.append(s.key, a[s.key] || ''); });
      fetch('ai-lead.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }).catch(function () { /* 通信失敗時もlocalStorageには保存済み */ });
    } catch (e) { /* fetch非対応環境は無視 */ }
  }

  function finish() {
    progressBar.style.width = '100%';
    clearInput();
    saveLead(answers);
    sendLeadEmail(answers);
    renderSummary(answers);
    botMsg('ありがとうございます。');
    botMsg('詳細査定は店長が直接確認いたします。現在の情報から査定可能です。');
    botMsg('LINEまたはお電話にて、正式査定をご案内いたします。');

    var cta = document.createElement('div');
    cta.className = 'ai-result-cta';
    cta.innerHTML =
      '<a href="' + LINE_URL + '" target="_blank" rel="noopener" class="btn btn--line btn--lg">' +
        '<span class="btn__txt">LINEで相談する</span></a>' +
      '<a href="' + TEL_URL + '" class="btn btn--tel btn--lg">' +
        '<span class="btn__txt">電話で相談する</span></a>';
    var restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'ai-restart';
    restart.textContent = 'もう一度相談する';
    restart.addEventListener('click', start);
    cta.appendChild(restart);
    body.appendChild(cta);
    scrollBottom();
  }

  /* ---- 保存（localStorage） ---- */
  function loadLeads() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveLead(a) {
    try {
      var leads = loadLeads();
      var rec = { 日時: new Date().toLocaleString('ja-JP') };
      STEPS.forEach(function (s) { rec[s.label] = a[s.key] || ''; });
      leads.push(rec);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch (e) { /* 保存不可環境は無視 */ }
  }

  /* ---- CSV出力 ---- */
  function exportCSV() {
    var leads = loadLeads();
    var headers = ['日時'].concat(STEPS.map(function (s) { return s.label; }));
    var lines = [headers.join(',')];
    leads.forEach(function (rec) {
      var row = headers.map(function (h) {
        var v = (rec[h] == null ? '' : String(rec[h])).replace(/"/g, '""');
        return '"' + v + '"';
      });
      lines.push(row.join(','));
    });
    var csv = '﻿' + lines.join('\r\n'); // BOM付きでExcel文字化け防止
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'ai-soudan-leads.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  window.exportAILeads = exportCSV; // コンソールからも実行可能

  /* ---- 開閉 ---- */
  function open() {
    overlay.hidden = false;
    chat.hidden = false;
    fab.classList.add('is-hidden');
    if (!started) { started = true; start(); }
  }
  function close() {
    overlay.hidden = true;
    chat.hidden = true;
    fab.classList.remove('is-hidden');
  }
  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !chat.hidden) close();
  });

  /* ---- 管理パネル（#ai-admin） ---- */
  var admin = document.getElementById('aiAdmin');
  if (admin) {
    var aCount = document.getElementById('aiAdminCount');
    var aCsv = document.getElementById('aiAdminCsv');
    var aClear = document.getElementById('aiAdminClear');
    var aClose = document.getElementById('aiAdminClose');
    function openAdmin() {
      aCount.textContent = loadLeads().length + ' 件';
      admin.hidden = false;
    }
    function maybeOpenAdmin() { if (location.hash === '#ai-admin') openAdmin(); }
    window.addEventListener('hashchange', maybeOpenAdmin);
    maybeOpenAdmin();
    if (aCsv) aCsv.addEventListener('click', exportCSV);
    if (aClear) aClear.addEventListener('click', function () {
      if (window.confirm('保存データをすべて削除しますか？')) {
        localStorage.removeItem(STORAGE_KEY);
        aCount.textContent = '0 件';
      }
    });
    if (aClose) aClose.addEventListener('click', function () {
      admin.hidden = true;
      if (location.hash === '#ai-admin') { history.replaceState(null, '', location.pathname); }
    });
  }
})();
