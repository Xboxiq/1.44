/* ============================================================
   توليد ملف Word (.docx) من القالب الأصلي
   يأخذ قالب الجهة الرسمي (data/templates/<CODE>.docx) المعلَّم
   بعلامات {{field}} و {{cb__group__idx}}، ويملؤه بقيم المستخدم،
   ويُخرج .docx مطابقاً للأصل (يبقى القالب الرسمي، تُملأ القيم فقط).
   يعمل بالكامل في المتصفح (PizZip + docxtemplater) بلا خادم.
   ============================================================ */
(function () {
  'use strict';

  const BOX_ON = '\u2611';   // ☑ مربع مؤشّر
  const BOX_OFF = '\u2610';  // ☐ مربع فارغ

  // كل النماذج لها قالب جاهز في data/templates/<CODE>.docx
  function templateUrl(code) { return 'data/templates/' + code + '.docx'; }

  window.hasWordTemplate = function (code) {
    return !!(window.App && App.data && App.data.services && App.data.services[code]);
  };

  // حلّ بلوك $ref (نسخة مبسّطة مطابقة لمنطق app.js)
  function resolveBlock(block) {
    if (block && block.$ref) {
      const ref = App.data.common[block.$ref];
      if (!ref) return block;
      const out = JSON.parse(JSON.stringify(ref));
      Object.keys(block).forEach((k) => { if (k !== '$ref') out[k] = block[k]; });
      return out;
    }
    return block;
  }

  // يجمع مجموعات الصناديق (checks) من بلوكات الخدمة بالترتيب
  function collectCheckGroups(code) {
    const groups = [];
    function walk(o) {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === 'object') {
        if (o.t === 'checks' && o.name) {
          groups.push({ name: o.name, options: o.options || [], mode: o.mode || 'single' });
        }
        Object.keys(o).forEach((k) => { const v = o[k]; if (v && typeof v === 'object') walk(v); });
      }
    }
    const blocks = (App.data.services[code].form.blocks || []).map(resolveBlock);
    blocks.forEach(walk);
    return groups;
  }

  // يبني كائن البيانات الذي يملأ كل علامات القالب
  function buildData(code, values) {
    values = values || {};
    const data = {};

    // 1) الحقول النصية: انسخ كل القيم النصية كما هي
    Object.keys(values).forEach((k) => {
      const v = values[k];
      if (v !== undefined && v !== null && typeof v !== 'object') data[k] = String(v);
    });

    // 2) الصناديق inline: لكل مجموعة، علّم الخيار المختار ☑ والباقي ☐
    collectCheckGroups(code).forEach((g) => {
      const val = values[g.name];
      g.options.forEach((opt, i) => {
        let on = false;
        if (g.mode === 'multi') {
          on = Array.isArray(val) ? val.indexOf(opt) !== -1 : false;
        } else {
          on = (val === opt) || (val === i) || (String(val) === String(i));
        }
        data['cb__' + g.name + '__' + i] = on ? BOX_ON : BOX_OFF;
      });
    });

    return data;
  }

  async function fetchTemplate(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('تعذّر تحميل قالب الوورد (' + res.status + ')');
    return res.arrayBuffer();
  }

  // يبني مستند docxtemplater جاهز (blob)
  async function renderDoc(code, values) {
    if (!window.hasWordTemplate(code)) throw new Error('لا يتوفّر قالب Word لهذا النموذج.');
    if (typeof window.PizZip === 'undefined' || typeof window.docxtemplater === 'undefined') {
      throw new Error('مكتبات توليد Word غير محمّلة.');
    }
    const buf = await fetchTemplate(templateUrl(code));
    const zip = new window.PizZip(buf);
    const Docxtemplater = window.docxtemplater;
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: function () { return ''; },
    });
    doc.render(buildData(code, values));
    return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });
  }

  // تنزيل ملف Word
  window.generateWord = async function (code, values, opts) {
    opts = opts || {};
    const blob = await renderDoc(code, values);
    triggerDownload(blob, (opts.fileName || code) + '.docx');
    return true;
  };

  // طباعة Word مباشرة: نعرض ملف الوورد المولَّد كـHTML مطابق داخل إطار معزول
  // (iframe) ثم نطبعه مباشرة — فيخرج «نسخة الوورد نفسها» بضغطة واحدة بلا خادم.
  // إن لم تتوفّر مكتبة المعاينة (docx-preview/JSZip) نرجع لفتح/تنزيل الملف.
  window.printWord = async function (code, values, opts) {
    opts = opts || {};
    const fileName = opts.fileName || code;
    const blob = await renderDoc(code, values);

    if (!window.docx || typeof window.docx.renderAsync !== 'function' || typeof window.JSZip === 'undefined') {
      // بديل: افتح الملف ليُطبع من Word (Ctrl+P) أو نزّله.
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) triggerDownload(blob, fileName + '.docx');
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      return { mode: 'external' };
    }

    await renderDocxToPrintFrame(blob, fileName);
    return { mode: 'print' };
  };

  // معاينة حيّة داخل الصفحة: نعرض «نسخة الوورد نفسها» مملوءة بقيم المستخدم
  // داخل حاوية مرئية (لا iframe) لتظهر تماماً كالنموذج الورقي الأصلي.
  // تُستخدم في تبويب «المعاينة المطابقة» وتُحدَّث كلما تغيّرت القيم.
  window.canPreviewWord = function (code) {
    return !!(window.hasWordTemplate(code)
      && window.docx && typeof window.docx.renderAsync === 'function'
      && typeof window.JSZip !== 'undefined');
  };

  window.previewWord = async function (code, values, container, opts) {
    opts = opts || {};
    if (!container) throw new Error('لا توجد حاوية للمعاينة.');
    if (!window.canPreviewWord(code)) throw new Error('مكتبة المعاينة غير متوفّرة.');

    const blob = await renderDoc(code, values);
    const ab = (blob && typeof blob.arrayBuffer === 'function') ? await blob.arrayBuffer() : blob;

    // نرسم في حاوية مؤقتة ثم نبدّلها دفعة واحدة (يمنع وميض الإفراغ أثناء التحديث الحيّ)
    const staging = document.createElement('div');
    await window.docx.renderAsync(ab, staging, null, {
      className: 'docx',
      inWrapper: true,
      hideWrapperOnPrint: true,   // تفكيك .docx-wrapper عند الطباعة → يمنع قصّ RTL ويُلغي الظلال/الهوامش
      ignoreWidth: true,          // عرض متجاوب يلتزم بحدود A4 → يحلّ overflow السالب في RTL
      ignoreHeight: false,        // نحافظ على ارتفاع الصفحة الحقيقي للحفاظ على فواصل الصفحات
      breakPages: true,           // فواصل صفحات تلقائية
      experimental: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      useBase64URL: true,
      debug: false,
    });

    container.innerHTML = '';
    while (staging.firstChild) container.appendChild(staging.firstChild);

    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
    return true;
  };

  // مطابقة الأصل: النماذج الرسمية تستخدم Arial للنص العربي/اللاتيني.
  // لذا نوحّد خطوط القالب الافتراضية (Aptos غير المثبّت) على Arial — لا Cairo —
  // كي تظهر «النسخة» مطابقة لِما يعرضه Word تماماً. بدائل متوافقة مقاسياً لِلِينُكس.
  const FONT_STACK = "'Arial','Liberation Sans','Arimo','Segoe UI','Tahoma',sans-serif";

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function docxStabilityCss(pageRule) {
    return (pageRule || '') +
      'html, body { margin: 0; padding: 0; background: #fff; direction: rtl; }' +
      'body { -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }' +
      '* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }' +
      '.docx-wrapper { background: #fff !important; padding: 0 !important; display: block !important; }' +
      '.docx-wrapper > section.docx { box-shadow: none !important; margin: 0 auto !important; overflow: hidden !important; }' +
      // مُحدِّد أعلى من ".docx" لتجاوز خطوط القالب الافتراضية (Aptos غير المثبّت + العربي الفارغ)
      '.docx-wrapper section.docx {' +
      '  --docx-minorHAnsi-font: ' + FONT_STACK + ';' +
      '  --docx-majorHAnsi-font: ' + FONT_STACK + ';' +
      '  --docx-minorBidi-font: ' + FONT_STACK + ';' +
      '  --docx-majorBidi-font: ' + FONT_STACK + ';' +
      '}' +
      '.docx-wrapper section.docx table { border-collapse: collapse; }' +
      '.docx-wrapper section.docx input, .docx-wrapper section.docx textarea { font: inherit; }';
  }

  function appendStyle(doc, cssText) {
    const style = doc.createElement('style');
    style.textContent = cssText;
    doc.head.appendChild(style);
    return style;
  }

  async function waitForDocumentAssets(doc) {
    try { if (doc.fonts && doc.fonts.ready) await doc.fonts.ready; } catch (e) {}
    const images = Array.from(doc.images || []);
    await Promise.all(images.map(function (img) {
      if (img.complete) return true;
      if (typeof img.decode === 'function') return img.decode().catch(function () {});
      return new Promise(function (resolve) {
        img.onload = img.onerror = resolve;
      });
    }));
  }

  // يعرض الـblob داخل iframe معزول ثم يطبعه (لا يتأثّر بـ print.css ولا بورقة .sheet)
  async function renderDocxToPrintFrame(blob, title) {
    const prev = document.getElementById('word-print-frame');
    if (prev) prev.remove();

    // نمرّر ArrayBuffer لـ docx-preview (أكثر متانة من Blob عبر المتصفّحات)
    const ab = (blob && typeof blob.arrayBuffer === 'function') ? await blob.arrayBuffer() : blob;

    // إطار بحجم حقيقي خارج الشاشة (أكثر موثوقية للطباعة من إطار بحجم صفر)
    const iframe = document.createElement('iframe');
    iframe.id = 'word-print-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed; left:-10000px; top:0; width:820px; height:1160px; border:0; opacity:0;';
    document.body.appendChild(iframe);

    const idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' +
      escapeHtml(title) + '</title></head><body></body></html>');
    idoc.close();

    // لا نحمّل خطوطاً خارجية: المطابقة تتطلّب خطوط النموذج الأصلية (Arial)
    // المتوفّرة على نظام المستخدم — فتخرج «النسخة» مطابقة لِما يعرضه Word.

    await window.docx.renderAsync(ab, idoc.body, idoc.head, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      experimental: true,      // يفعّل رسم علامات الجدولة (tab stops) بدقّة → يضبط التباعد/الترتيب
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      useBase64URL: true,
    });

    // حجم الصفحة من المستند نفسه (لا نفرض A4) — يمنع التصغير وتشوّه التنسيق
    let sizeRule = 'size: auto;';
    const sec = idoc.querySelector('section.docx') || idoc.querySelector('section');
    if (sec && sec.style && sec.style.width && sec.style.minHeight) {
      sizeRule = 'size: ' + sec.style.width + ' ' + sec.style.minHeight + ';';
    }

    // أنماط الطباعة + ضبط الخطوط (خصوصاً العربي غير المعرّف في القالب)
    appendStyle(idoc, docxStabilityCss('@page { ' + sizeRule + ' margin: 0; }'));

    const win = iframe.contentWindow;
    win.onafterprint = function () { setTimeout(function () { iframe.remove(); }, 300); };
    // إزالة احتياطية إن لم يُطلق onafterprint (بعض المتصفحات)
    setTimeout(function () { const f = document.getElementById('word-print-frame'); if (f) f.remove(); }, 120000);

    // انتظر اكتمال الخطوط والصور قبل فتح نافذة الطباعة كي لا تختلف المحاذاة عند الطباعة
    await waitForDocumentAssets(idoc);
    await new Promise(function (r) { setTimeout(r, 450); });
    try { win.focus(); win.print(); } catch (e) {}
  }

  function triggerDownload(blob, fileName) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 1000);
  }
})();
