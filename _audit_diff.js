// Diff docx placeholders vs services.json field names per service code
const fs = require('fs');
const path = require('path');

const specs = JSON.parse(fs.readFileSync(path.join(__dirname, '_audit', 'specs.json'), 'utf8'));
const services = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'services.json'), 'utf8'));

const common = services.common || {};
function resolveBlock(b) {
  if (b && b.$ref) {
    const ref = common[b.$ref];
    if (!ref) return b;
    const out = JSON.parse(JSON.stringify(ref));
    Object.keys(b).forEach(k => { if (k !== '$ref') out[k] = b[k]; });
    return out;
  }
  return b;
}

function collectFieldNames(svc) {
  const names = new Set();
  const requiredNames = new Set();
  const checkGroups = []; // { name, options }
  function walk(o) {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o && typeof o === 'object') {
      if ((o.t === 'field' || (o.name && o.kind && !o.t)) && o.name) {
        names.add(o.name);
        if (o.required) requiredNames.add(o.name);
      }
      if ((o.t === 'checks' || o.type === 'checks') && o.name) {
        names.add(o.name);
        checkGroups.push({ name: o.name, options: o.options || [], mode: o.mode || 'multi' });
      }
      // checklist auto-fields use name pattern like base_n / base_n_note
      if (o.type === 'checklist') {
        const base = o.name || 'cl';
        (o.rows || []).forEach(r => {
          if (o.detailsInput) names.add(`${base}_${r.n}`);
          if (o.check !== false) names.add(`${base}_${r.n}`);
          if (o.notes) names.add(`${base}_${r.n}_note`);
        });
      }
      // routing also acts as checks
      if (o.type === 'routing' && o.name) {
        names.add(o.name);
        checkGroups.push({ name: o.name, options: o.options || [], mode: o.mode || 'multi' });
      }
      Object.keys(o).forEach(k => { const v = o[k]; if (v && typeof v === 'object') walk(v); });
    }
  }
  const blocks = (svc.form && svc.form.blocks || []).map(resolveBlock);
  blocks.forEach(walk);
  return { names, requiredNames, checkGroups };
}

const codes = Object.keys(services.services || {}).sort();
const report = {};
let totalMissingInCode = 0;
let totalExtraInCode = 0;
let totalSpecPh = 0;

for (const code of codes) {
  const svc = services.services[code];
  const { names, requiredNames, checkGroups } = collectFieldNames(svc);
  const spec = specs[code] || { placeholders: [] };
  const specPh = (spec.placeholders || []).filter(p => !p.startsWith('#') && !p.startsWith('/') && !p.startsWith('^'));
  // Expand check groups into cb__name__i form to compare
  const codeCheckPh = new Set();
  checkGroups.forEach(g => g.options.forEach((_, i) => codeCheckPh.add(`cb__${g.name}__${i}`)));

  // Code provides: text fields by name + cb__... for check groups
  const codeProvides = new Set([...names, ...codeCheckPh]);

  // What the docx template asks for (placeholders, excluding control tags)
  const specAsks = new Set(specPh);

  // Missing in code = template asks for it but code doesn't provide that name
  const missing = [...specAsks].filter(p => !codeProvides.has(p));
  // Extra in code = code declares a field name that template never references
  // (but only count plain field names, not cb__ which we expand from groups)
  const extra = [...names].filter(n => !specAsks.has(n) && !specAsks.has(`cb__${n}__0`));

  report[code] = {
    title: spec.title?.slice(0, 50) || '',
    specPlaceholders: specAsks.size,
    codeFields: names.size,
    codeCheckGroups: checkGroups.length,
    requiredFieldsCount: requiredNames.size,
    missingInCode: missing,
    extraInCode: extra,
  };
  totalMissingInCode += missing.length;
  totalExtraInCode += extra.length;
  totalSpecPh += specAsks.size;
}

fs.writeFileSync(path.join(__dirname, '_audit', 'diff.json'), JSON.stringify(report, null, 2));

// Print a compact summary table
console.log('CODE  | spec | code | req | miss | extra | top missing');
console.log('------+------+------+-----+------+-------+------------');
for (const code of codes) {
  const r = report[code];
  const topMiss = r.missingInCode.slice(0, 4).join(',');
  console.log(`${code} | ${String(r.specPlaceholders).padStart(4)} | ${String(r.codeFields).padStart(4)} | ${String(r.requiredFieldsCount).padStart(3)} | ${String(r.missingInCode.length).padStart(4)} | ${String(r.extraInCode.length).padStart(5)} | ${topMiss}`);
}
console.log('---');
console.log('TOTAL missing-in-code:', totalMissingInCode);
console.log('TOTAL extra-in-code  :', totalExtraInCode);
console.log('TOTAL spec placeholders:', totalSpecPh);
