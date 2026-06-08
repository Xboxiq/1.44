// One-shot: extract title, headings, labels, and {{placeholders}} from each .docx
// Output: _audit/specs.json (compact) — used to diff vs services.json
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TPL_DIR = path.join(__dirname, 'data', 'templates');
const OUT_DIR = path.join(__dirname, '_audit');
const TMP = path.join(__dirname, '_audit_tmp');
fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(TPL_DIR).filter(f => f.endsWith('.docx')).sort();
const result = {};

for (const f of files) {
  const code = f.replace('.docx', '');
  const src = path.join(TPL_DIR, f);
  // clean tmp
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(TMP, { recursive: true });
  try {
    execSync(`unzip -o -q "${src}" word/document.xml -d "${TMP}"`, { stdio: 'pipe' });
  } catch (e) {
    result[code] = { error: 'unzip_failed' };
    continue;
  }
  const xmlPath = path.join(TMP, 'word', 'document.xml');
  if (!fs.existsSync(xmlPath)) { result[code] = { error: 'no_document_xml' }; continue; }
  const xml = fs.readFileSync(xmlPath, 'utf8');

  // Extract all text runs <w:t ...>TEXT</w:t> in order
  const textRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const texts = [];
  let m;
  while ((m = textRe.exec(xml)) !== null) {
    const t = m[1]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    if (t.trim()) texts.push(t);
  }
  // Detect docxtemplater placeholders {name}
  const placeholders = new Set();
  const phRe = /\{([^{}\n]{1,80}?)\}/g;
  for (const t of texts) {
    let p;
    while ((p = phRe.exec(t)) !== null) {
      const v = p[1].trim();
      if (v && !v.startsWith('#') && !v.startsWith('/') && !v.startsWith('^')) placeholders.add(v);
      else if (v.startsWith('#') || v.startsWith('/') || v.startsWith('^')) placeholders.add(v);
    }
  }
  // Heuristic: labels are non-placeholder Arabic text fragments
  const labels = texts.filter(t => !/^\{[^{}]+\}$/.test(t)).map(s => s.trim());
  result[code] = {
    title: texts[0] || '',
    labelCount: labels.length,
    labels,
    placeholders: [...placeholders].sort(),
  };
}

// cleanup tmp
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}

fs.writeFileSync(path.join(OUT_DIR, 'specs.json'), JSON.stringify(result, null, 2));
console.log('OK', Object.keys(result).length, 'forms ->', path.join(OUT_DIR, 'specs.json'));
// print a summary
for (const [k, v] of Object.entries(result)) {
  console.log(k, '|', (v.title || '').slice(0, 40), '| labels:', v.labelCount, '| ph:', v.placeholders?.length || 0);
}
