# 🧠 مكتبة المهارات (Skills)

مهارات احترافية قابلة لإعادة الاستخدام تُوجّه المنفّذ (Kiro / Claude) لبناء واجهات ومنتجات احترافية.
كل مهارة بصيغة **Agent Skill** (مجلد فيه `SKILL.md` بترويسة YAML + متن مختصر)، بحيث تُكتشف وتُحمّل عند الحاجة فقط (progressive disclosure) لتوفير السياق.

## ترتيب الأولوية (مقصود)
1. **`01-ui-ux-design`** — مبادئ التصميم، أنظمة التصميم (Design Tokens)، الوصولية، الـ microinteractions.
2. **`02-flutter-development`** — معمارية طبقية/نظيفة، إدارة الحالة، الأداء، Flutter Web.
3. **`03-web-development`** — HTML/CSS/JS حديث، أداء، طباعة A4، RTL عربي، إمكانية الوصول.

> القاعدة: **التصميم أولاً (UI/UX)** يحكم القرارات، ثم تقنية التنفيذ (Flutter أو Web) حسب المشروع.

## كيفية الاستخدام
- **مع Kiro:** انسخ مجلدات المهارات إلى `~/.kiro/skills/` (مستوى المستخدم) أو `.kiro/skills/` (مستوى المشروع)، ثم فعّلها عند الحاجة.
- **مع Claude (Agent Skills):** ارفع كل مجلد كمهارة، وسيكتشفها Claude تلقائياً حسب وصفها (`description`).
- **يدوياً:** أرفق محتوى `SKILL.md` المناسب مع البرومت الرئيسي.

## بنية كل مهارة
```
NN-skill-name/
  SKILL.md           ← الترويسة (name, description) + إجراء + checklist + فحوص قبول
  references/        ← (اختياري) تفاصيل طويلة تُحمّل عند الطلب
```

## مراجع (مُلخّصة ومُعاد صياغتها للامتثال)
- صيغة المهارات الرسمية: [Anthropic — Skill authoring best practices](https://docs.anthropic.com/en/agents-and-tools/agent-skills/best-practices)
- الوصولية كسياسة نظام تصميم: [testparty.ai](https://testparty.ai/blog/accessibility-as-design-system-policy)
- تصميم وصولي 2026: [forasoft.com](https://www.forasoft.com/blog/article/ai-accessibility-ui-ux-design)
- معمارية Flutter: [docs.flutter.dev/app-architecture](https://docs.flutter.dev/app-architecture/concepts)
- إدارة حالة Flutter 2026: [foresightmobile.com](https://foresightmobile.com/blog/top-flutter-state-management-libraries-in-2023)
- RTL وخصائص CSS المنطقية: [W3C i18n](https://www.w3.org/International/tutorials/bidi-xhtml/) · [simplelocalize.io](https://simplelocalize.io/blog/posts/rtl-design-guide-developers/)
- HTML/الوصولية 2025: [broworks.net](https://www.broworks.net/blog/web-accessibility-best-practices-2025-guide)

> ملاحظة: المحتوى أعلاه مُلخّص ومُعاد صياغته من مصادر متعددة للامتثال لقيود الترخيص.
