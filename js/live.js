/* =====================================================================
   Pastor Olumide Oni — shared site script ("Live and Bright" design)
   - Live data comes from the Netlify functions (YouTube feed, Shorts,
     playlists, library, community posts). If they can't be reached
     (e.g. in a preview copy of the site), the saved snapshot in /data
     is used and thumbnails fall back to the copies in /img/yt and /img/dw.
   ===================================================================== */
(function () {
  'use strict';

  var host = location.hostname;
  var LIVE = /(^|\.)pastorolumideoni\.com$/.test(host) || /netlify\.app$/.test(host) ||
             host === 'localhost' || /^127\./.test(host);

  var CHANNEL = 'https://www.youtube.com/@PastorOlumideOni';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- data ---------- */
  var cache = {};
  function getData(name) {
    if (cache[name]) return cache[name];
    var p = (LIVE
      ? fetch('/.netlify/functions/' + name + '?_=' + Date.now(), { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      : Promise.reject(new Error('preview')))
      .catch(function () {
        return fetch('data/' + name + '.json').then(function (r) {
          if (!r.ok) throw new Error(r.status);
          markPreview();
          return r.json();
        });
      })
      .catch(function (e) { console.warn('[site] could not load ' + name, e); return null; });
    cache[name] = p;
    return p;
  }

  function markPreview() {
    var n = document.getElementById('previewNote');
    if (n) n.classList.add('show');
  }

  /* ---------- images ---------- */
  function ytThumb(id, q) {
    return LIVE ? 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/' + (q || 'hqdefault') + '.jpg'
                : 'img/yt/' + encodeURIComponent(id) + '.jpg';
  }
  function ytImg(id, q, alt) {
    return '<img src="' + esc(ytThumb(id, q)) + '" data-fb="img/yt/' + esc(id) + '.jpg" alt="' + esc(alt || '') + '" loading="lazy" decoding="async">';
  }
  function postImg(post, i) {
    var url = post.images && post.images[i] ? post.images[i].url : '';
    return LIVE && url ? url : 'img/dw/' + post.id + '-' + i + '.jpg';
  }
  // One delegated handler swaps broken images for the saved local copy
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.dataset.fb && t.getAttribute('src') !== t.dataset.fb) {
      t.src = t.dataset.fb;
    }
  }, true);

  /* ---------- titles ---------- */
  function titleCase(s) {
    var small = { a: 1, an: 1, and: 1, the: 1, of: 1, in: 1, to: 1, at: 1, for: 1, on: 1, or: 1, by: 1, is: 0 };
    return s.toLowerCase().split(' ').map(function (w, i) {
      if (i > 0 && small[w]) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function splitTitle(raw) {
    var t = String(raw || '').replace(/^\s*(LIVE|🔴\s*LIVE)\s*\|\s*/i, '');
    t = t.split(' | ')[0].trim();
    var main = t, sub = '';
    var i = t.indexOf(': ');
    if (i > 0) { main = t.slice(0, i); sub = t.slice(i + 2); }
    main = main.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();
    if (main === main.toUpperCase()) main = titleCase(main);
    return { main: main, sub: sub };
  }
  function shortTitle(raw) { return String(raw || '').split(' | ')[0].trim(); }
  var EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
  // Split a post into a short headline (first line, or its first sentence if the line is long) and the rest
  function postParts(text) {
    var lines = String(text || '').split('\n').map(function (l) { return l.replace(EMOJI, '').trim(); }).filter(Boolean);
    var first = lines[0] || '', rest = lines.slice(1).join(' ');
    if (first.length > 48) {
      var m = first.match(/^(.{8,60}?[.!?])\s+(.+)$/);
      if (m) { first = m[1]; rest = (m[2] + ' ' + rest).trim(); }
      else if (first.length > 70) first = first.slice(0, 67).replace(/\s+\S*$/, '') + '…';
    }
    return { title: first || 'Daily Word', rest: rest };
  }
  function postTitle(text) { return postParts(text).title; }
  function postExcerpt(text, max) {
    var rest = postParts(text).rest.replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
    max = max || 160;
    if (rest.length > max) rest = rest.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
    return rest;
  }
  function ageDays(s) {
    var m = String(s || '').match(/(\d+)\s+(minute|hour|day|week|month|year)/i);
    if (!m) return null;
    var n = +m[1], u = m[2].toLowerCase();
    return n * ({ minute: 0, hour: 0, day: 1, week: 7, month: 30, year: 365 }[u]);
  }

  /* ---------- live service countdown (Wednesdays 8:30 AM Central) ---------- */
  function partsIn(ms, tz) {
    var o = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  function nextLive(now) {
    var d = new Date(now);
    for (var i = -1; i < 9; i++) {
      for (var h = 13; h <= 14; h++) {
        var ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + i, h, 30);
        var p = partsIn(ms, 'America/Chicago');
        if (p.weekday === 'Wed' && p.hour === '08' && p.minute === '30' && ms + 2 * 3600e3 > now) return ms;
      }
    }
    return now;
  }
  function fmtTime(ms, tz) {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  }
  function initCountdowns() {
    var boxes = document.querySelectorAll('[data-countdown]');
    if (!boxes.length) return;
    function tick() {
      var now = Date.now(), at = nextLive(now), s = Math.max(0, Math.floor((at - now) / 1000));
      var live = now >= at;
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var vals = [pad(Math.floor(s / 86400)), pad(Math.floor(s % 86400 / 3600)), pad(Math.floor(s % 3600 / 60)), pad(s % 60)];
      boxes.forEach(function (box) {
        box.querySelectorAll('[data-u]').forEach(function (el, i) { el.textContent = vals[i]; });
        box.querySelectorAll('[data-tz]').forEach(function (el) { el.textContent = fmtTime(at, el.dataset.tz); });
        var ln = box.querySelector('.live-now'); if (ln) ln.style.display = live ? 'block' : 'none';
        var ct = box.querySelector('.count'); if (ct) ct.style.display = live ? 'none' : '';
      });
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---------- header ---------- */
  function initNav() {
    var btn = document.querySelector('.menu-btn'), nav = document.getElementById('siteNav');
    if (btn && nav) {
      btn.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.addEventListener('click', function (e) { if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    }
    var page = document.body.dataset.page;
    document.querySelectorAll('#siteNav a').forEach(function (a) {
      if (a.dataset.page === page) a.setAttribute('aria-current', 'page');
    });
    var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- rails: arrow buttons ---------- */
  function initRails() {
    document.querySelectorAll('[data-rail-prev],[data-rail-next]').forEach(function (b) {
      b.addEventListener('click', function () {
        var rail = document.getElementById(b.dataset.railPrev || b.dataset.railNext);
        if (!rail) return;
        rail.scrollBy({ left: (b.dataset.railPrev ? -1 : 1) * rail.clientWidth * 0.8, behavior: 'smooth' });
      });
    });
  }

  /* ---------- video lightbox (live site only; preview opens YouTube) ---------- */
  var lb, lbStage, lbFrame, lbOpener;
  function ensureLightbox() {
    if (lb) return;
    lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Video player');
    lb.innerHTML = '<div class="lb-inner"><button class="lb-close" type="button" aria-label="Close video">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="lb-stage"><iframe title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div>';
    document.body.appendChild(lb);
    lbStage = lb.querySelector('.lb-stage'); lbFrame = lb.querySelector('iframe');
    lb.querySelector('.lb-close').addEventListener('click', closeVideo);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeVideo(); });
  }
  function openVideo(el) {
    ensureLightbox();
    var id = el.dataset.video, type = el.dataset.type || 'video', list = el.dataset.list;
    var q = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
    if (list) q.set('list', list);
    lbStage.className = 'lb-stage' + (type === 'short' ? ' short' : '');
    lbFrame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?' + q.toString();
    lbOpener = el;
    lb.classList.add('open'); document.body.classList.add('lb-lock');
    setTimeout(function () { lb.querySelector('.lb-close').focus(); }, 50);
  }
  function closeVideo() {
    if (!lb) return;
    lbFrame.src = 'about:blank';
    lb.classList.remove('open'); document.body.classList.remove('lb-lock');
    if (lbOpener) { try { lbOpener.focus(); } catch (e) {} lbOpener = null; }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a[data-video]');
    if (!el || !LIVE || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    openVideo(el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb && lb.classList.contains('open')) closeVideo();
  }, true);

  /* ---------- shared card builders ---------- */
  function videoCard(item, opts) {
    opts = opts || {};
    var id = item.videoId || item.id;
    var st = splitTitle(item.title);
    var link = item.link || ('https://www.youtube.com/watch?v=' + id);
    var meta = [item.pubDate, item.duration].filter(Boolean).join(' · ');
    return '<a class="card" href="' + esc(link) + '" target="_blank" rel="noopener" data-video="' + esc(id) + '"' +
      (opts.list ? ' data-list="' + esc(opts.list) + '"' : '') + '>' +
      '<span class="thumb r169">' + ytImg(id, 'hqdefault') + '<span class="play" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#0F1B3D"/></svg></span></span>' +
      (opts.tag ? '<span class="tag">' + esc(opts.tag) + '</span>' : '') +
      '<span class="card-t">' + esc(st.main) + '</span>' +
      (st.sub ? '<span class="card-s">' + esc(st.sub) + '</span>' : '') +
      (meta && !opts.noMeta ? '<span class="card-s">' + esc(meta) + '</span>' : '') +
      '</a>';
  }
  function shortCard(s) {
    var id = s.videoId || s.id;
    return '<a class="short" href="https://www.youtube.com/shorts/' + esc(id) + '" target="_blank" rel="noopener" data-video="' + esc(id) + '" data-type="short">' +
      '<span class="thumb r916">' + ytImg(id, 'hqdefault') + '</span><b>' + esc(shortTitle(s.title)) + '</b></a>';
  }

  /* ---------- topics (keyword match on titles) ---------- */
  var TOPICS = [
    ['all', 'Everything', null],
    ['pain', 'Pain and purpose', ['pain', 'purpose', 'praise', 'midnight', 'sorrow', 'rejoice']],
    ['faith', 'Faith', ['faith', 'believe', 'trust', 'dream', 'receive', 'word of god']],
    ['breakthrough', 'Breakthrough', ['breakthrough', 'unstoppable', 'lifting', 'open heaven', 'delay', 'manifest', 'miracle']],
    ['grace', 'Grace and strength', ['grace', 'strength', 'power', 'working', 'protect', 'testimony']],
    ['prayer', 'Prayer and deliverance', ['prayer', 'pray', 'deliverance', 'crusade', 'altar', 'fire', 'backfire']]
  ];
  function matchTopic(item, key) {
    var t = TOPICS.filter(function (x) { return x[0] === key; })[0];
    if (!t || !t[2]) return true;
    var title = String(item.title || '').toLowerCase();
    return t[2].some(function (k) { return title.indexOf(k) > -1; });
  }
  function bindChips(container, onPick) {
    container.innerHTML = TOPICS.map(function (t, i) {
      return '<button type="button" class="chip" data-topic="' + t[0] + '" aria-pressed="' + (i === 0) + '">' + esc(t[1]) + '</button>';
    }).join('');
    container.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      container.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      onPick(c.dataset.topic, c.textContent);
    });
  }

  // Book reading pages open in the site's reader. In a preview copy only the sample books
  // listed here are bundled; the rest open the published reader on pastorolumideoni.com.
  var PREVIEW_BOOKS = ['connecting-to-your-next-miracle', 'preparation-for-manifestation'];
  function bookLink(slug) {
    return (LIVE || PREVIEW_BOOKS.indexOf(slug) > -1) ? 'href="reader.html?book=' + esc(slug) + '"'
      : 'href="https://pastorolumideoni.com/reader.html?book=' + esc(slug) + '" target="_blank" rel="noopener"';
  }

  window.Site = {
    LIVE: LIVE, bookLink: bookLink, CHANNEL: CHANNEL, esc: esc, getData: getData, ytThumb: ytThumb, ytImg: ytImg, postImg: postImg,
    splitTitle: splitTitle, shortTitle: shortTitle, postTitle: postTitle, postExcerpt: postExcerpt, ageDays: ageDays,
    videoCard: videoCard, shortCard: shortCard, matchTopic: matchTopic, bindChips: bindChips, openVideo: openVideo
  };

  document.addEventListener('DOMContentLoaded', function () { initNav(); initCountdowns(); initRails(); });
})();
