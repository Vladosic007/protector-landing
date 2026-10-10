(function(){
  'use strict';

  /* ======================================================================
     КОНФИГ
     formEndpoint — URL веб-приложения Google Apps Script (появится на этапе
     «таблица»). Пока пусто → форма работает в демо-режиме (показывает
     «Спасибо», но никуда не отправляет).
     ====================================================================== */
  var CONFIG = {
    formEndpoint: 'https://script.google.com/macros/s/AKfycbzzBe-Ve6rEUNtlstOclpFm5a7lNL5RtlqeYUUD-61yRffpBCjeA_M33C-Icy-gEtCh2Q/exec',
    phonePrimary: '8 960 405-89-87'
  };

  var RATE = 2000;             // ₽ за м² (прозрачная плёнка, «от»)

  // ---------- Мобильное меню ----------
  var hdr = document.getElementById('hdr');
  var burger = document.getElementById('burger');
  if (burger && hdr) {
    burger.addEventListener('click', function(){
      var open = hdr.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    hdr.querySelectorAll('.nav a').forEach(function(a){
      a.addEventListener('click', function(){
        hdr.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Открыть меню');
      });
    });
  }

  // ---------- Калькулятор стоимости ----------
  var area = document.getElementById('area');
  var out = document.getElementById('calcOut');
  var presets = document.getElementById('calcPresets');

  function fmt(n){ return n.toLocaleString('ru-RU'); }

  function markActivePreset(){
    if (!presets) return;
    var v = (area.value || '').replace(',', '.');
    presets.querySelectorAll('button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-area') === v);
    });
  }

  function calc(){
    if (!area || !out) return;
    var v = parseFloat((area.value || '').replace(',', '.'));
    if (!isFinite(v) || v <= 0) { out.textContent = 'от 2 000 ₽'; markActivePreset(); return; }
    out.textContent = 'от ' + fmt(Math.round(v * RATE)) + ' ₽';
    markActivePreset();
  }

  if (area) {
    area.addEventListener('input', calc);
    calc();
  }
  if (presets) {
    presets.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        area.value = b.getAttribute('data-area');
        calc();
      });
    });
  }

  // ---------- Копирование телефона ----------
  var cp = document.getElementById('copyPhone');
  var pn = document.getElementById('phoneNum');
  if (cp && pn) {
    cp.addEventListener('click', function(){
      var t = pn.textContent.trim();
      function done(){
        var o = cp.innerHTML;
        cp.textContent = 'Скопировано';
        setTimeout(function(){ cp.innerHTML = o; }, 1600);
      }
      function sel(){
        var r = document.createRange();
        r.selectNode(pn);
        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        done();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done).catch(sel);
      } else {
        sel();
      }
    });
  }

  // ---------- Форма заявки ----------
  var form = document.getElementById('leadForm');
  var ok = document.getElementById('formOk');
  var err = document.getElementById('formErr');

  function sendLead(data){
    // Google Apps Script: шлём form-urlencoded (simple-запрос, без CORS-preflight).
    // mode:'no-cors' — ответ «непрозрачный» и не читается, но запись проходит.
    // Успешный резолв промиса = запрос доставлен; ошибка — только при обрыве сети.
    var payload = {};
    for (var k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) payload[k] = data[k];
    }
    // ведущий апостроф — чтобы Google Таблица хранила телефон как текст,
    // иначе номер с «+» воспринимается как формула и даёт #ERROR
    if (payload.phone) payload.phone = "'" + payload.phone;
    return fetch(CONFIG.formEndpoint, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams(payload)
    });
  }

  if (form) {
    var submitBtn = form.querySelector('button[type=submit]');
    var submitLabel = submitBtn ? submitBtn.textContent : 'Отправить заявку';

    function resetForm(){
      form.classList.remove('is-sending');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();

      // honeypot: если скрытое поле заполнено — это бот, тихо выходим
      if (form._gotcha && form._gotcha.value) return;

      if (!form.checkValidity()) {
        if (form.reportValidity) form.reportValidity();
        return;
      }

      if (ok) ok.classList.remove('show');
      if (err) err.classList.remove('show');

      var data = {
        name:  (form.name ? form.name.value : '').trim(),
        phone: (form.phone ? form.phone.value : '').trim(),
        area:  (form.area ? form.area.value : '').trim(),
        page:  location.href,
        ts:    new Date().toLocaleString('ru-RU')
      };

      // Демо-режим: эндпоинт ещё не настроен
      if (!CONFIG.formEndpoint) {
        if (ok) ok.classList.add('show');
        if (submitBtn) submitBtn.textContent = 'Заявка отправлена';
        setTimeout(function(){
          form.reset();
          if (ok) ok.classList.remove('show');
          resetForm();
        }, 4000);
        return;
      }

      // Боевой режим: отправляем в таблицу
      form.classList.add('is-sending');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Отправляем…'; }

      sendLead(data).then(function(){
        if (ok) ok.classList.add('show');
        if (submitBtn) submitBtn.textContent = 'Заявка отправлена';
        setTimeout(function(){
          form.reset();
          if (ok) ok.classList.remove('show');
          resetForm();
        }, 4000);
      }).catch(function(){
        resetForm();
        if (err) err.classList.add('show');
      });
    });
  }

  // ---------- Доступность: прячем декоративные иконки от скринридеров ----------
  document.querySelectorAll('svg:not([aria-label]):not([role]):not([aria-hidden])')
    .forEach(function(s){ s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); });

  // ---------- Анимации: sticky-header + появление при скролле ----------
  document.documentElement.classList.add('js'); // дубль инлайн-скрипта из <head>

  // уплотнение шапки при прокрутке
  if (hdr) {
    var onScroll = function(){ hdr.classList.toggle('scrolled', window.scrollY > 10); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // появление блоков при входе во вьюпорт (reveal). Группы: [селектор, шаг stagger мс]
  var revealGroups = [
    ['.section .eyebrow', 0], ['.section .section-h', 0], ['.section .lead', 0],
    ['.steps .card', 90], ['.beforeafter .ba', 90], ['.notestrip span', 60],
    ['.prod .prod-card', 90], ['.spec li', 45], ['.aud .aud-card', 70],
    ['.affects li', 70], ['.calc', 100],
    ['.mount .mount-col', 90], ['.cert', 0], ['.chips li', 70],
    ['.proc .proc-step', 90], ['.faq details', 50],
    ['.form', 0], ['.contact-info', 120]
  ];
  var revealEls = [];
  revealGroups.forEach(function(g){
    document.querySelectorAll(g[0]).forEach(function(el, i){
      if (el.classList.contains('reveal')) return; // не назначаем дважды
      el.classList.add('reveal');
      if (g[1]) el.style.transitionDelay = (i * g[1]) + 'ms';
      revealEls.push(el);
    });
  });

  var motionOK = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (motionOK && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

})();
