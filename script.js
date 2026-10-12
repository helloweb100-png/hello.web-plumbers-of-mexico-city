/* ════════════════════════════════════════════════════════════════
   PLOMEROS DE LA CDMX — script.js
   Módulos: preloader · scroll suave (lerp) · motor de scroll ·
   nav/menú · reveals · hero (canvas, typing, parallax) · marquee ·
   servicios fijados · tubería de proceso · paneles · radar ·
   FAQ · formulario → WhatsApp · cursor · efectos de botones.
   Sin dependencias. Respeta prefers-reduced-motion.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ───────────── Utilidades ───────────── */
  var doc = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeExpo = function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var WA_NUMBER = '525587749110';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* Ejecuta cada módulo aislado: si uno falla, el resto del sitio sigue vivo */
  function safe(fn) { try { fn(); } catch (err) { if (window.console) console.error('[init]', fn.name, err); } }

  function waUrl(msg) { return 'https://wa.me/' + WA_NUMBER + (msg ? '?text=' + encodeURIComponent(msg) : ''); }

  /* ───────────── Enlaces de WhatsApp (data-wa → href) ───────────── */
  function initWhatsAppLinks() {
    $$('[data-wa]').forEach(function (a) { a.href = waUrl(a.getAttribute('data-wa')); });
  }

  /* ───────────── Motor de scroll: un solo listener, muchos suscriptores ───────────── */
  var scrollSubs = [];
  var scrollVel = 0;
  var lastY = window.scrollY;
  var queued = false;
  function onScroll(fn) { scrollSubs.push(fn); }
  function runScroll(force) {
    queued = false;
    var y = window.scrollY;
    if (!force && y === lastY) return;
    scrollVel += y - lastY;
    lastY = y;
    for (var i = 0; i < scrollSubs.length; i++) scrollSubs[i](y);
  }
  window.addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(function () { runScroll(false); }); }
  }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(function () { runScroll(true); }); });

  /* ───────────── Scroll suave con inercia (lerp) — solo mouse/trackpad ───────────── */
  var smooth = { on: false, target: 0, current: 0, raf: 0, last: 0, expected: 0 };
  function maxScroll() { return Math.max(0, doc.scrollHeight - window.innerHeight); }
  function smoothTick(now) {
    var dt = Math.min(.05, (now - smooth.last) / 1000);
    smooth.last = now;
    smooth.current += (smooth.target - smooth.current) * (1 - Math.exp(-dt * 5.2));
    if (Math.abs(smooth.target - smooth.current) < .2) smooth.current = smooth.target;
    window.scrollTo(0, smooth.current);
    smooth.expected = window.scrollY;
    runScroll(false);
    smooth.raf = smooth.current === smooth.target ? 0 : requestAnimationFrame(smoothTick);
  }
  function smoothKick() {
    if (!smooth.raf) { smooth.last = performance.now(); smooth.raf = requestAnimationFrame(smoothTick); }
  }
  function initSmoothScroll() {
    if (reduced || !finePointer) return;
    smooth.on = true;
    doc.classList.add('lenis');
    smooth.target = smooth.current = window.scrollY;
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (doc.classList.contains('menu-open') || doc.classList.contains('is-loading')) return;
      if (e.target.closest && e.target.closest('textarea, select, [data-lenis-prevent]')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 34; else if (e.deltaMode === 2) dy *= window.innerHeight;
      if (!smooth.raf) smooth.target = smooth.current = window.scrollY;
      smooth.target = clamp(smooth.target + dy, 0, maxScroll());
      smoothKick();
    }, { passive: false });
    /* Si el scroll lo mueve otra cosa (teclado, barra, ancla) resincronizamos */
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (!smooth.raf) { if (Math.abs(y - smooth.current) > 1.5) smooth.target = smooth.current = y; }
      else if (Math.abs(y - smooth.expected) > 6) { smooth.target = smooth.current = y; }
    }, { passive: true });
  }
  function scrollToY(y) {
    y = clamp(y, 0, maxScroll());
    if (smooth.on) {
      if (!smooth.raf) smooth.current = window.scrollY;
      smooth.target = y;
      smoothKick();
    } else {
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  /* ───────────── Anclas internas ───────────── */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      var y = id === '#inicio' ? 0 : target.getBoundingClientRect().top + window.scrollY - 8;
      closeMenu();
      scrollToY(y);
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  /* ───────────── Preloader: manómetro de presión ───────────── */
  function readyPage() {
    doc.classList.remove('is-loading');
    doc.classList.add('is-ready');
    if (smooth.on) { smooth.target = smooth.current = window.scrollY; }
    runScroll(true);
    document.dispatchEvent(new Event('site:ready'));
  }

  function initLoader() {
    var loader = $('#loader');
    if (!loader) { readyPage(); return; }

    /* Marcas del manómetro */
    var ticksG = $('#ldTicks');
    var TICKS = 28;
    var ticks = [];
    for (var i = 0; i < TICKS; i++) {
      var ang = (-135 + i * (270 / (TICKS - 1))) * Math.PI / 180;
      var major = i % 3 === 0;
      var r1 = 90, r2 = major ? 99 : 95;
      var ln = document.createElementNS(SVG_NS, 'line');
      ln.setAttribute('x1', (100 + r1 * Math.sin(ang)).toFixed(2));
      ln.setAttribute('y1', (100 - r1 * Math.cos(ang)).toFixed(2));
      ln.setAttribute('x2', (100 + r2 * Math.sin(ang)).toFixed(2));
      ln.setAttribute('y2', (100 - r2 * Math.cos(ang)).toFixed(2));
      ln.setAttribute('class', 'ld-tick' + (major ? ' is-major' : ''));
      ticksG.appendChild(ln);
      ticks.push(ln);
    }

    var arc = $('#ldArc'), needle = $('#ldNeedle'), water = $('#ldWater');
    var pctEl = $('#ldPct'), msgEl = $('#ldMsg');
    var msgs = ['Verificando tuberías', 'Calibrando presión', 'Abriendo válvulas', 'Sistema listo'];
    var MIN = reduced ? 600 : 2500, MAX = 5200;
    var t0 = performance.now(), p = 0, loaded = document.readyState === 'complete', finished = false, lastMsg = -1;
    window.addEventListener('load', function () { loaded = true; });

    function paint() {
      arc.style.strokeDashoffset = (367.6 * (1 - p)).toFixed(1);
      needle.style.transform = 'rotate(' + (-135 + p * 270).toFixed(1) + 'deg)';
      water.style.height = (p * 100).toFixed(1) + '%';
      pctEl.textContent = Math.round(p * 100);
      var lit = Math.round(p * TICKS);
      for (var k = 0; k < TICKS; k++) ticks[k].classList.toggle('is-on', k < lit);
      var m = p < .3 ? 0 : p < .62 ? 1 : p < .99 ? 2 : 3;
      if (m !== lastMsg) { lastMsg = m; msgEl.textContent = msgs[m]; }
    }

    function finish() {
      if (finished) return;
      finished = true;
      p = 1; paint();
      setTimeout(function () {
        loader.classList.add('is-out');
        readyPage();
        setTimeout(function () { loader.classList.add('is-gone'); loader.remove(); }, 1500);
      }, 380);
    }

    function frame(now) {
      var elapsed = now - t0;
      var sim = easeOut(clamp(elapsed / MIN, 0, 1)) * .92;
      var target = (loaded && elapsed >= MIN) || elapsed >= MAX ? 1 : sim;
      p += (target - p) * .085;
      if (target === 1 && p > .992) { finish(); return; }
      paint();
      requestAnimationFrame(frame);
    }
    paint();
    requestAnimationFrame(frame);
    /* Salvavidas: pase lo que pase, el sitio se muestra */
    setTimeout(finish, MAX + 2500);
  }

  /* ───────────── Navegación: estado, enlaces activos, menú móvil ───────────── */
  var burger, menu;
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    menu.setAttribute('aria-hidden', 'true');
    doc.classList.remove('menu-open');
  }
  function initNav() {
    var nav = $('.nav');
    burger = $('#burger');
    menu = $('#menu');
    var links = $$('.nav-links a');
    var sections = $$('main > section[id]');
    var bar = $('#progressBar');

    burger.addEventListener('click', function () {
      var open = !menu.classList.contains('is-open');
      if (!open) { closeMenu(); return; }
      menu.classList.add('is-open');
      burger.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Cerrar menú');
      menu.setAttribute('aria-hidden', 'false');
      doc.classList.add('menu-open');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) closeMenu(); });

    onScroll(function (y) {
      nav.classList.toggle('is-stuck', y > 24);
      var max = maxScroll();
      bar.style.transform = 'scaleX(' + (max ? clamp(y / max, 0, 1).toFixed(4) : 0) + ')';
      var vh = window.innerHeight, current = '';
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= vh * .4) current = sections[i].id;
      }
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + current); });
    });
  }

  /* ───────────── Botón flotante de WhatsApp + volver arriba ───────────── */
  function initFloat() {
    var wrap = $('#waFloat'), tip = $('#waTip'), top = $('#toTop');
    var tipShown = false, tipTimer = 0;
    onScroll(function (y) {
      var show = y > window.innerHeight * .55;
      wrap.classList.toggle('is-in', show);
      if (show && !tipShown) {
        tipShown = true;
        tipTimer = setTimeout(function () {
          tip.classList.add('is-show');
          setTimeout(function () { tip.classList.remove('is-show'); }, 6500);
        }, 2500);
      }
      if (!show) { tip.classList.remove('is-show'); }
    });
    wrap.addEventListener('click', function () { clearTimeout(tipTimer); tip.classList.remove('is-show'); });
    if (top) top.addEventListener('click', function () { scrollToY(0); });
  }

  /* ───────────── Titulares: división en palabras + reveals por IntersectionObserver ───────────── */
  function splitWords(root) {
    root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
    var idx = 0;
    (function walk(node, grad) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            var inner = document.createElement('span');
            w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            inner.className = 'w-in' + (grad ? ' grad-w' : '');
            inner.style.setProperty('--i', idx++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          var isGrad = grad || child.classList.contains('grad');
          child.classList.remove('grad');
          walk(child, isGrad);
        }
      });
    })(root, false);
  }

  function initReveals() {
    $$('[data-split]').forEach(splitWords);
    var targets = $$('[data-reveal], [data-split], .chips');
    if (!('IntersectionObserver' in window) || reduced) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -7% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* Manifiesto: las palabras se iluminan mientras haces scroll */
  function initScrub() {
    var el = $('[data-scrub]');
    if (!el) return;
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'sw'; s.textContent = part;
            frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) { walk(child); }
      });
    })(el);
    var marks = $$('mark', el);
    var shown = -1;
    function update() {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var p = reduced ? 1 : clamp((vh * .82 - r.top) / (r.height + vh * .4), 0, 1);
      var lit = Math.round(p * words.length);
      if (lit === shown) return;
      shown = lit;
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('is-lit', i < lit);
      marks.forEach(function (m) {
        var ws = $$('.sw', m);
        m.classList.toggle('is-lit', ws.length && ws.every(function (w) { return w.classList.contains('is-lit'); }));
      });
    }
    onScroll(update);
    update();
  }

  /* Contadores animados */
  function initCounters() {
    var els = $$('[data-count]');
    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10), start = null;
      if (reduced) { el.textContent = target; return; }
      requestAnimationFrame(function step(ts) {
        if (!start) start = ts;
        var t = clamp((ts - start) / 1900, 0, 1);
        el.textContent = Math.round(easeExpo(t) * target);
        if (t < 1) requestAnimationFrame(step);
      });
    }
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: .6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* Parallax suave de imágenes (data-parallax="factor") */
  function initParallax() {
    var els = $$('[data-parallax]');
    if (!els.length || reduced) return;
    onScroll(function () {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var d = (r.top + r.height / 2 - vh / 2) * parseFloat(el.getAttribute('data-parallax'));
        el.style.transform = 'translate3d(0,' + d.toFixed(1) + 'px,0)';
      });
    });
  }

  /* ───────────── HERO · canvas: burbujas, olas y ondas al hacer clic ───────────── */
  function initHeroCanvas() {
    var canvas = $('#heroCanvas'), hero = $('#inicio');
    if (!canvas || !hero) return;
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, dpr = 1, bubbles = [], rings = [], mouse = { x: -999, y: -999 };
    var running = false, raf = 0, tPrev = 0, time = 0;

    function makeBubble(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 20 + Math.random() * 60,
        r: 1.3 + Math.pow(Math.random(), 2.2) * 6,
        vy: .16 + Math.random() * .6,
        ph: Math.random() * 6.28,
        sw: .25 + Math.random() * .7,
        a: .25 + Math.random() * .5,
        hot: Math.random() < .09
      };
    }
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(clamp(w * h / 17000, 16, 64));
      bubbles = []; for (var i = 0; i < n; i++) bubbles.push(makeBubble(true));
    }
    function wave(base, amp, len, spd, c1, c2, stroke) {
      ctx.beginPath(); ctx.moveTo(0, h);
      for (var x = 0; x <= w + 8; x += 8) {
        var y = base + Math.sin(x / len + time * spd) * amp + Math.sin(x / (len * .55) - time * spd * 1.35) * amp * .42;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath();
      var g = ctx.createLinearGradient(0, base - amp, 0, h);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fill();
      if (stroke) {
        ctx.beginPath();
        for (var x2 = 0; x2 <= w + 8; x2 += 8) {
          var y2 = base + Math.sin(x2 / len + time * spd) * amp + Math.sin(x2 / (len * .55) - time * spd * 1.35) * amp * .42;
          if (x2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    function draw(dt) {
      ctx.clearRect(0, 0, w, h);
      var base = h - clamp(h * .16, 70, 130);
      wave(base + 18, 12, 120, 1.0, 'rgba(255,122,26,.12)', 'rgba(242,58,36,.02)', null);
      wave(base + 8, 16, 170, .7, 'rgba(47,123,255,.22)', 'rgba(20,86,224,.04)', null);
      wave(base, 20, 230, .5, 'rgba(25,216,224,.26)', 'rgba(20,86,224,.05)', 'rgba(92,231,235,.55)');

      /* Burbujas */
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        b.y -= b.vy * dt * 60;
        b.x += Math.sin(time * b.sw + b.ph) * .35;
        var dx = b.x - mouse.x, dy = b.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 130 * 130) {
          var d = Math.sqrt(d2) || 1, f = (1 - d / 130) * 2.6;
          b.x += dx / d * f; b.y += dy / d * f;
        }
        if (b.y < -20) { bubbles[i] = makeBubble(false); continue; }
        var rim = b.hot ? '255,150,60' : '92,231,235';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + rim + ',' + (b.a * .14) + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(' + rim + ',' + (b.a * .85) + ')'; ctx.lineWidth = 1; ctx.stroke();
        if (b.r > 2.6) {
          ctx.beginPath(); ctx.arc(b.x - b.r * .3, b.y - b.r * .32, b.r * .22, 0, 6.2832);
          ctx.fillStyle = 'rgba(255,255,255,' + (b.a * .8) + ')'; ctx.fill();
        }
      }
      /* Ondas de clic */
      for (var j = rings.length - 1; j >= 0; j--) {
        var rg = rings[j];
        rg.r += dt * 260; rg.a -= dt * .9;
        if (rg.a <= 0) { rings.splice(j, 1); continue; }
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 6.2832);
        ctx.strokeStyle = 'rgba(92,231,235,' + rg.a + ')'; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }
    function loop(now) {
      var dt = Math.min(.05, (now - tPrev) / 1000); tPrev = now; time += dt;
      draw(dt);
      raf = running ? requestAnimationFrame(loop) : 0;
    }
    function start() { if (running || reduced) return; running = true; tPrev = performance.now(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; }

    resize();
    if (reduced) { draw(0); }
    window.addEventListener('resize', function () { resize(); if (reduced) draw(0); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(hero);
    } else start();
    hero.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    hero.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a, button')) return;
      var r = canvas.getBoundingClientRect();
      rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 6, a: .7 });
    });
  }

  /* HERO · efecto máquina de escribir */
  function initCycle() {
    var el = $('#cycle');
    if (!el || reduced) return;
    var words = el.getAttribute('data-words').split('|');
    var wi = 0, ci = words[0].length, del = false;
    function tick() {
      var word = words[wi];
      if (!del) {
        ci++; el.textContent = word.slice(0, ci);
        if (ci >= word.length) { del = true; return setTimeout(tick, 1800); }
        return setTimeout(tick, 80 + Math.random() * 60);
      }
      ci--; el.textContent = word.slice(0, ci);
      if (ci <= 0) { del = false; wi = (wi + 1) % words.length; return setTimeout(tick, 320); }
      setTimeout(tick, 38);
    }
    document.addEventListener('site:ready', function () { setTimeout(function () { del = true; tick(); }, 3200); }, { once: true });
  }

  /* HERO · lectura viva del manómetro */
  function initGauge() {
    var el = $('#gaugeRead');
    if (!el || reduced) return;
    var v = 4.2;
    setInterval(function () {
      v = clamp(v + (Math.random() - .5) * .5, 3.6, 4.8);
      el.textContent = v.toFixed(1) + ' BAR';
    }, 1100);
  }

  /* HERO · parallax con el puntero + profundidad al hacer scroll */
  function initHeroParallax() {
    var hero = $('#inicio'), vis = $('#heroVisual');
    var layout = $('.hero-grid-layout', hero), bg = $('.hero-bg', hero);
    if (!hero || !vis) return;
    var frame = $('.hv-frame', vis);
    var layers = $$('[data-depth]', vis);
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false, visible = true;

    if (finePointer && !reduced) {
      hero.addEventListener('pointermove', function (e) {
        tx = e.clientX / window.innerWidth - .5; ty = e.clientY / window.innerHeight - .5;
        if (!running) { running = true; requestAnimationFrame(loop); }
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { tx = ty = 0; if (!running) { running = true; requestAnimationFrame(loop); } });
    }
    function loop() {
      cx += (tx - cx) * .07; cy += (ty - cy) * .07;
      frame.style.transform = 'rotateY(' + (cx * 7).toFixed(2) + 'deg) rotateX(' + (-cy * 6).toFixed(2) + 'deg)';
      layers.forEach(function (l) {
        var d = parseFloat(l.getAttribute('data-depth'));
        l.style.translate = (-cx * d).toFixed(1) + 'px ' + (-cy * d).toFixed(1) + 'px';
      });
      if (Math.abs(tx - cx) < .001 && Math.abs(ty - cy) < .001) { running = false; return; }
      requestAnimationFrame(loop);
    }
    if (!reduced) {
      onScroll(function (y) {
        var vh = window.innerHeight;
        if (y > vh * 1.1) { if (visible) { visible = false; } return; }
        visible = true;
        layout.style.transform = 'translate3d(0,' + (y * .16).toFixed(1) + 'px,0)';
        layout.style.opacity = clamp(1 - y / (vh * .95), 0, 1).toFixed(3);
        bg.style.transform = 'translate3d(0,' + (y * .28).toFixed(1) + 'px,0)';
      });
    }
  }

  /* ───────────── MARQUEE: bandas infinitas con velocidad ligada al scroll ───────────── */
  function initMarquee() {
    var wrap = $('#marquee');
    var rows = $$('[data-marquee]');
    if (!wrap || !rows.length) return;
    rows.forEach(function (row) {
      var track = $('.mq-track', row);
      row._html = track.innerHTML;
      row._dir = parseInt(row.getAttribute('data-marquee'), 10) || -1;
      row._pos = 0;
      track.setAttribute('aria-hidden', 'true');
    });
    function measure() {
      rows.forEach(function (row) {
        var track = $('.mq-track', row);
        track.innerHTML = row._html;
        var unit = track.scrollWidth;
        var copies = Math.ceil((window.innerWidth * 1.4) / Math.max(unit, 1)) + 2;
        track.innerHTML = new Array(copies + 1).join(row._html);
        row._unit = unit;
      });
    }
    var raf = 0, last = 0, running = false;
    function frame(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      var boost = clamp(scrollVel, -140, 140) * .45;
      scrollVel *= .9;
      rows.forEach(function (row) {
        if (!row._unit) return;
        row._pos = ((row._pos + 58 * dt + boost) % row._unit + row._unit) % row._unit;
        var x = row._dir === -1 ? -row._pos : row._pos - row._unit;
        $('.mq-track', row).style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      });
      raf = running ? requestAnimationFrame(frame) : 0;
    }
    function start() { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else running = false; }, { rootMargin: '120px' }).observe(wrap);
    } else start();
  }

  /* ───────────── Spotlight, magnetismo y ripples ───────────── */
  function initPointerFx() {
    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      }, { passive: true });
    });
    if (finePointer && !reduced) {
      $$('[data-magnetic]').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
          el.style.transform = 'translate3d(' + (x * .16).toFixed(1) + 'px,' + (y * .26).toFixed(1) + 'px,0)';
        });
        el.addEventListener('pointerleave', function () { el.style.transform = ''; });
      });
    }
    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest && e.target.closest('.btn');
      if (!btn || reduced) return;
      var r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height);
      var dot = document.createElement('span');
      dot.className = 'ripple-dot';
      dot.style.width = dot.style.height = size + 'px';
      dot.style.left = (e.clientX - r.left - size / 2) + 'px';
      dot.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(dot);
      setTimeout(function () { dot.remove(); }, 750);
    });
  }

  /* Cursor personalizado (solo con mouse) */
  function initCursor() {
    if (!finePointer || reduced) return;
    var dot = document.createElement('div'), ring = document.createElement('div');
    dot.className = 'cursor-dot'; ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring); document.body.appendChild(dot);
    doc.classList.add('has-cursor');
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', function () { dot.style.opacity = ring.style.opacity = 0; });
    document.addEventListener('pointerenter', function () { dot.style.opacity = ring.style.opacity = ''; });
    window.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
    document.addEventListener('pointerover', function (e) {
      ring.classList.toggle('is-hover', !!(e.target.closest && e.target.closest('a, button, .chip, .panel, [data-magnetic], summary')));
    });
    (function loop() {
      rx += (mx - rx) * .16; ry += (my - ry) * .16;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ───────────── SERVICIOS: sección fijada que cambia con el scroll ───────────── */
  function initServices() {
    var sec = $('#servicios'), track = $('#svcTrack');
    if (!sec || !track) return;
    var items = $$('.svc-item', sec), steps = $$('#svcSteps li', sec), n = items.length;
    var pinned = false, current = -1;

    function setup() {
      var should = !reduced && window.innerHeight >= 600 && window.innerWidth >= 340;
      if (should === pinned) return;
      pinned = should;
      sec.classList.toggle('is-pinned', pinned);
      sec.style.setProperty('--svc-n', n);
      if (!pinned) { items.forEach(function (it) { it.removeAttribute('data-state'); }); current = -1; }
      else { current = -1; update(); }
    }
    function update() {
      if (!pinned) return;
      var r = track.getBoundingClientRect();
      var total = Math.max(1, r.height - window.innerHeight);
      var p = clamp(-r.top / total, 0, .9999);
      var f = p * n, idx = Math.floor(f), local = f - idx;
      if (idx !== current) {
        current = idx;
        items.forEach(function (it, i) { it.setAttribute('data-state', i < idx ? 'before' : i > idx ? 'after' : 'active'); });
      }
      steps.forEach(function (li, i) {
        li.style.setProperty('--p', i < idx ? 1 : i === idx ? local.toFixed(3) : 0);
        li.classList.toggle('is-on', i === idx);
        li.classList.toggle('is-done', i < idx);
      });
    }
    steps.forEach(function (li, i) {
      $('button', li).addEventListener('click', function () {
        var r = track.getBoundingClientRect();
        var total = Math.max(1, r.height - window.innerHeight);
        scrollToY(window.scrollY + r.top + ((i + .5) / n) * total);
      });
    });
    onScroll(update);
    window.addEventListener('resize', function () { setup(); update(); });
    setup();
  }

  /* ───────────── PROCESO: la tubería se llena y activa las válvulas ───────────── */
  function initPipe() {
    var wrap = $('#pipeWrap');
    if (!wrap) return;
    var steps = $$('.pstep', wrap), nodes = steps.map(function (s) { return $('.pstep-node', s); });
    function update() {
      var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
      var pipeH = r.height - 16;
      var pf = clamp(vh * .56 - (r.top + 8), 0, pipeH);
      wrap.style.setProperty('--pf', pf.toFixed(1) + 'px');
      steps.forEach(function (s, i) {
        var nr = nodes[i].getBoundingClientRect();
        s.classList.toggle('is-on', pf >= nr.top + nr.height / 2 - (r.top + 8));
      });
    }
    onScroll(update);
    update();
  }

  /* ───────────── PANELES expandibles (a quién atendemos) ───────────── */
  function initPanels() {
    var panels = $$('#panels .panel');
    if (!panels.length) return;
    function open(p) {
      if (p.classList.contains('is-open')) return;
      panels.forEach(function (x) { x.classList.toggle('is-open', x === p); });
    }
    panels.forEach(function (p) {
      p.addEventListener('mouseenter', function () { if (finePointer && window.innerWidth >= 960) open(p); });
      p.addEventListener('focus', function () { open(p); });
      p.addEventListener('click', function () { open(p); });
    });
  }

  /* ───────────── COBERTURA: radar + chips + skyline que se dibuja ───────────── */
  function initCoverage() {
    var chips = $$('#chips .chip'), blipsBox = $('#blips'), label = $('#radarLabel'), radar = $('#radar');
    if (!chips.length || !blipsBox) return;
    var blips = [], active = -1, hovering = false, timer = 0;
    var DEFAULT = label.textContent;
    chips.forEach(function (chip, i) {
      chip.parentNode.style.setProperty('--i', i);
      var b = document.createElement('span');
      b.className = 'blip';
      b.style.left = chip.getAttribute('data-x') + '%';
      b.style.top = chip.getAttribute('data-y') + '%';
      b.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's';
      blipsBox.appendChild(b); blips.push(b);
      chip.addEventListener('mouseenter', function () { hovering = true; set(i); });
      chip.addEventListener('focus', function () { hovering = true; set(i); });
      chip.addEventListener('click', function () { hovering = true; set(i); });
      chip.addEventListener('mouseleave', function () { hovering = false; });
    });
    function set(i) {
      if (active > -1) { chips[active].classList.remove('is-on'); blips[active].classList.remove('is-on'); }
      active = i;
      chips[i].classList.add('is-on'); blips[i].classList.add('is-on');
      label.textContent = chips[i].textContent;
    }
    /* Recorrido automático mientras nadie interactúa */
    function auto() { if (!hovering) set((active + 1) % chips.length); }
    if (!reduced) {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          clearInterval(timer);
          if (es[0].isIntersecting) timer = setInterval(auto, 2200);
        }, { threshold: .25 }).observe(radar);
      } else timer = setInterval(auto, 2200);
    } else label.textContent = DEFAULT;

    /* Skyline que se dibuja con el scroll */
    var sky = $('#covSkyline');
    if (sky) {
      var paths = $$('path', sky);
      function draw() {
        var r = sky.getBoundingClientRect(), vh = window.innerHeight;
        var p = reduced ? 1 : clamp((vh - r.top) / (vh * .5), 0, 1);
        paths.forEach(function (path, i) {
          var pi = clamp(p * 1.7 - i * .09, 0, 1);
          path.style.strokeDashoffset = (1 - easeOut(pi)).toFixed(3);
        });
      }
      onScroll(draw); draw();
    }
  }

  /* ───────────── FAQ: acordeón accesible ───────────── */
  function initFaq() {
    var qs = $$('.faq-q');
    qs.forEach(function (q) {
      q.addEventListener('click', function () {
        var open = q.getAttribute('aria-expanded') === 'true';
        qs.forEach(function (o) {
          o.setAttribute('aria-expanded', 'false');
          o.closest('.faq-item').classList.remove('is-open');
        });
        q.setAttribute('aria-expanded', open ? 'false' : 'true');
        q.closest('.faq-item').classList.toggle('is-open', !open);
      });
    });
  }

  /* ───────────── FORMULARIO → WhatsApp ───────────── */
  function initForm() {
    var form = $('#leadForm');
    if (!form) return;
    var btn = $('#formBtn'), ok = $('#formOk');
    function setErr(id, msg) {
      var field = $('#' + id).closest('.field');
      $('#e-' + id.replace('f-', '')).textContent = msg || '';
      field.classList.toggle('has-err', !!msg);
      $('#' + id).setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    ['f-nombre', 'f-servicio'].forEach(function (id) {
      $('#' + id).addEventListener('input', function () { setErr(id, ''); });
      $('#' + id).addEventListener('change', function () { setErr(id, ''); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = $('#f-nombre').value.trim(), servicio = $('#f-servicio').value;
      var zona = $('#f-zona').value, mensaje = $('#f-msg').value.trim();
      var espacio = (form.querySelector('input[name="espacio"]:checked') || {}).value || 'Hogar';
      var bad = null;
      if (nombre.length < 2) { setErr('f-nombre', 'Escribe tu nombre para atenderte mejor.'); bad = bad || 'f-nombre'; } else setErr('f-nombre', '');
      if (!servicio) { setErr('f-servicio', 'Elige qué servicio necesitas.'); bad = bad || 'f-servicio'; } else setErr('f-servicio', '');
      if (bad) { $('#' + bad).focus(); return; }

      var txt = '*Solicitud de servicio — Plomeros de la CDMX*\n\n' +
        '• Nombre: ' + nombre + '\n' +
        '• Servicio: ' + servicio + '\n' +
        '• Tipo de espacio: ' + espacio + '\n' +
        (zona ? '• Alcaldía: ' + zona + '\n' : '') +
        (mensaje ? '• Detalles: ' + mensaje + '\n' : '') +
        '\n¡Estoy listo para que me ayuden!';
      var url = waUrl(txt);
      window.open(url, '_blank', 'noopener');
      var fallback = $('a', ok); if (fallback) fallback.href = url;
      var label = $('span', btn), original = label.textContent;
      btn.classList.add('is-sending'); label.textContent = 'Abriendo WhatsApp…';
      setTimeout(function () { btn.classList.remove('is-sending'); label.textContent = original; ok.hidden = false; }, 1400);
    });
  }

  /* ───────────── FOOTER: texto gigante con desplazamiento horizontal ───────────── */
  function initFooter() {
    var foot = $('.footer');
    if (!foot || reduced) return;
    onScroll(function () {
      var r = foot.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top > vh || r.bottom < 0) return;
      var p = clamp((vh - r.top) / (vh + r.height * .4), 0, 1);
      foot.style.setProperty('--gx', ((p - .5) * 22).toFixed(2) + '%');
    });
  }

  /* ───────────── ARRANQUE ───────────── */
  function boot() {
    initWhatsAppLinks();
    [initSmoothScroll, initAnchors, initNav, initFloat, initReveals, initScrub, initCounters,
     initParallax, initHeroCanvas, initCycle, initGauge, initHeroParallax, initMarquee,
     initPointerFx, initCursor, initServices, initPipe, initPanels, initCoverage, initFaq,
     initForm, initFooter].forEach(safe);
    safe(initLoader);
    runScroll(true);
  }

  /* Al recargar, el navegador restaura la posición: empezamos desde arriba para ver el preloader completo */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
