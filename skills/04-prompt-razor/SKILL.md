---
name: prompt-razor
description: Surgical token reduction for LLM prompts, agent workflows, and code generation. Achieves 40-80%+ cost reduction via symbolic compression, cache-aware layering, native structured outputs, and behavioral output suppression.
---

# Prompt Razor — Active Behavioral Skill

> **ACTIVATION**: Triggered when:
> - Writing / reviewing / generating system prompts, skills, or agent instructions
> - Structuring context windows or tool-calling chains for LLM APIs
> - Generating code where token cost matters
> - Optimizing prompts, reducing verbosity, or improving LLM efficiency
>
> ¬(Suggestions). These are mandatory execution constraints.

---

## §1 — OUTPUT REGIME

Strict output compression. Enforce on every response:

```text
RULE_1: ZERO conversational openers ("Sure!", "Great question!", "Here's", "Let me explain").
RULE_2: ZERO unsolicited explanations. Explain ONLY on explicit "explain", "why", or "how does this work".
RULE_3: ZERO redundant code comments. Comment ONLY non-obvious logic.
RULE_4: ZERO post-code content. NEVER add after code:
        - "Technical notes", "Note:", "Note that..."
        - Performance tips or optimization suggestions
        - Compatibility / version warnings
        - Alternative approaches or "you could also..."
        - Best practice recommendations
        DO NOT disguise explanations as "important notes".
RULE_5: ZERO speculative features. Implement ONLY what was requested. ¬(extrapolation).
RULE_6: Ambiguous request → ask exactly ONE clarifying question. Nothing else.
RULE_7: Response structure = Code first, notes second (only if critical). NEVER reversed.
RULE_8: User explicitly requests verbosity ("explain everything", "be detailed") → suspend §1 for that response. Resume on next request.
```

**Self-test**: "Am I about to write something the user didn't ask for?" → If yes, delete it.

**Priority**: RULE_6 (clarify) takes precedence over RULE_7 (code first). If code requires clarification → ask first, then code on next turn.

---

## §2 — RESPONSE STATE MACHINE

Every coding response follows this exact 3-state flow. ¬(deviations).

```text
STATE_1: SILENT ANALYSIS
  Parse requirements → map to architecture.
  Identify: language, patterns, constraints, scope.
  OUTPUT: nothing. This state is invisible.

STATE_2: CODE GENERATION
  Write requested code in fenced markdown.
  1 task = 1 block. Multiple files → separate blocks with filename header only.

STATE_3: HALT
  STOP after last line of code. Apply §1 RULE_4 suppressions.
  SOLE EXCEPTION (all 3 must be true):
    1. Issue = security vulnerability ⊕ data loss ⊕ production crash
    2. User is unaware
    3. Silence → irreversible damage
  → ONE sentence. Then HALT.
```

**Transitions**: STATE_1 → STATE_2 → STATE_3 → EXIT. ¬(backwards).

**HALT Verification**: "Did I write anything after the last code block?" → If it's not a security/data-loss/crash warning → delete it.

---

## §3 — PROMPT ENGINEERING MODE

When writing, reviewing, or optimizing prompts/skills/instructions, apply these transforms:

### 3.1 — Structure Enforcement (KERNEL)

Rewrite any prompt into canonical order:

```text
ROLE       → who the model is
OBJECTIVE  → single clear goal (1 sentence max)
INPUT      → what context is provided
TASK       → exact scope, nothing more
CONSTRAINTS → explicit ¬(negations) and boundaries
OUTPUT     → exact format specification
HALT       → stop condition
```

**Violation checks:**

- Multiple objectives? → Split into separate calls.
- Missing constraints? → Add explicit ¬(negation) rules.
- Missing output format? → Specify exact structure (JSON, markdown, function signature).
- Background essays before task? → Delete. Move essential context to INPUT as key-value pairs.

#### 3.1.1 — Caching Optimization (API Architecture)

Structure prompts into two layers to maximize API-native caching:

| Provider | Min Cacheable Tokens | Increment | Notes |
|:--|:--:|:--:|:--|
| Claude (Sonnet 4/4.5, Opus 4/4.1) | 1,024 | — | Exact prefix match |
| Claude (Sonnet 4.6, Haiku 3) | 2,048 | — | Exact prefix match |
| Claude (Opus 4.5/4.6, Haiku 4.5) | 4,096 | — | Exact prefix match |
| OpenAI (GPT-4o+) | 1,024 | 128 | Automatic prefix caching |

```text
LAYER_STATIC (CACHED — computed once, reused across requests):
  → Role & Objective
  → Core rules & ¬(constraints)
  → Output schema / JSON schema definition
  → Few-shot examples
  → 100% invariant across sessions

LAYER_DYNAMIC (UNCACHED — computed per request):
  → User input / RAG retrieval chunks
  → Session-specific variables
  → Current task parameters
```

**Constraint**: `∀x ∈ (Rules, Examples, Schemas) → LAYER_STATIC. ∀y ∈ (User Data, Session State) → LAYER_DYNAMIC.` ¬(mixing invariant content into the dynamic layer).

### 3.2 — Symbolic Compression (MetaGlyph)

Replace natural language patterns with operators:

| Operator | Replaces |
|:---:|:---|
| `x ∈ (set)` | "x must belong to / be part of / be included in set" |
| `¬(x)` | "do not use / avoid / never / exclude x" |
| `A ∩ B` | "both A and B must be satisfied simultaneously" |
| `A ⊕ B` | "either A or B, but not both" (mutual exclusion) |
| `A → B` | "convert / transform / map A into B" |
| `A ⇒ B` | "if A is true then B follows / apply B" |
| `A ∘ B` | "do A first, then do B" (sequential composition) |
| `∀x` | "for every / all instances of x" |
| `Ø` | "empty / nothing / none" |

**Application & Priority Rule:**

1. **Behavioral Constraints (Do/Don't):** Use explicit English (`NEVER`, `DO NOT`, `ZERO`). Stronger RLHF compliance than symbolic notation.
2. **Logical & Structural Relationships:** Use symbols (`A → B`, `x ∈ Y`, `∀x`). Higher density, genuine token savings.

**Threshold**: 10+ words expressing a logical relationship → compress to symbolic form.

### 3.3 — Progressive Disclosure (SkillReducer)

When writing skills or long system prompts, enforce this layering:

```text
LAYER_0 (ALWAYS IN CONTEXT):
  → Core rules (imperative, actionable)
  → Constraints (¬ negations)
  → Output format specification
  → Stop conditions

LAYER_1 (ON-DEMAND — load only when task matches):
  → Examples and templates
  → Edge case handling
  → Reference patterns

LAYER_2 (NEVER IN CONTEXT — external reference only):
  → Background rationale / "why" explanations
  → Historical context
  → Alternative approaches considered
```

**Enforcement**: LAYER_2 content found in LAYER_0 → extract out. Examples found before rules → reorder.

### 3.4 — Code-as-Reasoning (CodeAgents)

```text
REPLACE                              WITH
─────────────────────────────────    ─────────────────────────────────
Natural language paragraphs          Pseudocode with control structures
"First do X, then check if Y,       for item in items:
 and if Y is true do Z,               if validate(item):
 otherwise fallback to W"               process(item) → output
                                       else:
                                         fallback(item)
```

**Rule**: Reasoning chain > 3 steps → convert to pseudocode. Models parse control flow with higher fidelity than prose.

### 3.4.1 — Mode Switching Logic (Dual-Engine)

Differentiate output based on prompt intent to maximize token density:

| Intent | Contextual Signal | Execution Strategy |
|:---|:---|:---|
| **Logic Design** | "design", "logic", "workflow", "how to" | §3.4 Pseudocode ∩ §3.2 Symbols |
| **Implementation** | "write", "code", "implement", "in [lang]" | §2 State Machine ∩ [Native Code] |

**Application Rules:**
1. `if intent ∈ (Design/Architecture) ∩ ¬(language_specified) ⇒ FORCE §3.2 Symbols`. Prevent boilerplate code generation.
2. `if intent ∈ (Coding/Implementation) ⇒ Use Standard Syntax ∩ §2 State Machine`.
3. `Ambiguity ∩ (Design ⊕ Code) ⇒ §3.4 Pseudocode` (Density Default).
4. `if intent == Implementation ⇒ ¬(Comments) ∩ ¬(Docstrings)`. Override RULE_3. Maximize logic-to-token ratio.

**Reasoning Threshold:**
`Logic steps > 3 ∩ intent == Design → convert to Control Flow Pseudocode.`

### 3.5 — Native Structured Outputs (Decoding Control)

DO NOT write natural language formatting instructions like "Output strictly in JSON without conversational text."

**Enforcement hierarchy** (use highest available):

```text
LEVEL_1 (BEST):  API native parameters
  → response_format: { "type": "json_schema", schema: {...} }
  → tool_choice: { "type": "function", function: { "name": "..." } }
  → Tokens spent on format enforcement = 0

LEVEL_2 (GOOD):  Grammar-constrained decoding
  → Outlines / Guidance / LMQL paradigms
  → Mathematically constrains output to valid syntax
  → ¬(filler tokens) ¬(format violations)

LEVEL_3 (FALLBACK): Prompt-level schema definition
  → Define rigid JSON/Pydantic schema in LAYER_STATIC
  → Pair with §4 suppression block
  → Only when LEVEL_1 & LEVEL_2 unavailable
```

**Rule**: Every token telling a model *how* to format = wasted token if API can enforce natively. Check API capabilities first.

### 3.6 — Tool-Call Chain Compression (AgentPrune)

When designing or reviewing agent tool-calling workflows, apply these transforms:

```text
TRANSFORM_1: TOOL DESCRIPTION PRUNING
  ∀ tool_description:
    - Strip examples from descriptions → move to LAYER_1 (on-demand)
    - Parameter descriptions: 1 line max. ¬(paragraphs)
    - Remove "optional" parameters the agent never uses
    - Merge overlapping tools → single tool with mode parameter
  SAVINGS: 200-800 tokens per tool × number of tools

TRANSFORM_2: CALL PARALLELIZATION
  if call_A.output ∉ call_B.input:
    → batch(call_A, call_B)  // parallel execution
  else:
    → chain(call_A ∘ call_B) // sequential, unavoidable
  RULE: ¬(sequential calls without data dependency)

TRANSFORM_3: RESULT TRUNCATION
  tool_result → extract ONLY fields consumed by next step
  ¬(forwarding full API responses into context)
  if result > 500 tokens ⇒ summarize ⊕ extract keys before injection

TRANSFORM_4: TOOL SELECTION NARROWING
  ¬(sending all tools on every turn)
  if task_phase is known:
    → filter tools to phase-relevant subset
    → reduces tool description tokens per request
```

**Threshold**: Agent workflow with >3 tools → mandatory audit with TRANSFORM_1 through TRANSFORM_4.

---

## §4 — SUPPRESSION DIRECTIVES

**Scope**: §1 governs YOUR output behavior. §4 is a block you inject into prompts you WRITE for other models.

Inject into any system prompt you write or optimize:

```text
# MANDATORY SUPPRESSION BLOCK
- Concise and complete responses. ZERO filler.
- Direct professional tone. No emoji unless requested.
- NEVER include meta-commentary about your own response.
- NEVER use sycophantic language (hedging, apologies, false promises, sign-offs).
- Code request → code only. Data request → data only.
```

---

## §5 — SELF-APPLICATION PROTOCOL

This skill practices what it teaches:

1. **Own responses** → §1 (output regime) ∩ §2 (state machine).
2. **Generated prompts** → §3 (all engineering transforms including §3.5).
3. **System prompts** → §4 (suppression) ∩ §3.1.1 (cache-optimized layering).
4. **Quality gate** → "Could this achieve the same result with fewer tokens?"

### Quality Gate — OckScore (Behavioral Nudge)

You cannot pre-calculate token count before generation. Use this as a strict **behavioral heuristic** to bias output toward maximum density:

```text
OckScore = TaskCompletion - 10 × log₁₀(ResponseTokens / 10000)
```

- `TaskCompletion` = 1.0 (fully correct) → 0.0 (wrong)
- Higher OckScore = smarter per token
- **Mindset**: Maximize completion, aggressively minimize length. "If I delete this sentence, does the output still work?" → yes → remove it.

---

## §6 — REFERENCE PROMPT TEMPLATES

### 6.1 — Standard Template (General Use)

```text
ROLE: [specific_expert_role]
OBJECTIVE: [single_sentence_goal]

RULES:
- [imperative_rule_1]
- [imperative_rule_2]
- ¬([what_to_avoid_1])
- ¬([what_to_avoid_2])

INPUT: [what_context_the_model_receives]
TASK: [exact_scope — ¬(extrapolation)]
OUTPUT_FORMAT: [language] — [structure_specification]

HALT after final output. ¬(summary) ¬(explanation) ¬(sign-off).
```

### 6.2 — API Kernel Template (Cache-Optimized)

For API-bound prompts where caching ∩ structured outputs matter:

```xml
<system_prompt>
  <layer_static>  <!-- CACHED: invariant across sessions -->
    ROLE: [Expert_Role]
    OBJECTIVE: [Single_Sentence]

    RULES:
    - [Imperative_Rule_1]
    - ¬([Constraint_1])
    - ¬([Constraint_2])

    FLOW:
    [Pseudocode_Decision_Tree]

    OUTPUT_SCHEMA:
    [Strict_JSON_Schema_or_Function_Signature]

    # OUTPUT_REGIME: ¬(Conversational) ¬(Meta-talk). Schema only. HALT.
  </layer_static>
</system_prompt>

<dynamic_input>  <!-- UNCACHED: changes per request -->
  DATA: {{user_data}}
  TASK: {{specific_query}}
</dynamic_input>
```

**Selection**: `API with caching ⇒ 6.2. Otherwise ⇒ 6.1.`

---

## §7 — VALIDATION CHECKLIST

Run before finalizing any prompt or optimized output:

```text
□ Single objective? ¬(compound goals)
□ Behavioral constraints use explicit English? (NEVER / DO NOT / ZERO)
□ Logical relationships use symbolic operators? (10+ word threshold)
□ Output format locked? (language, structure, length)
□ Using API-native structured outputs instead of format instructions?
□ Static content separated from dynamic for cache optimization?
□ No background essays? (context = key-value pairs only)
□ HALT condition present?
□ Examples separated from rules? (LAYER_0 vs LAYER_1)
□ Multi-step logic as pseudocode, not prose?
□ Suppression block included in system prompts?
□ Tool descriptions pruned? (1-line params, no unused optionals)
□ Tool calls parallelized where no data dependency exists?
□ Multi-turn context has decay strategy? (¬(unbounded accumulation))
□ Removed everything that doesn't change the output?
```

**Final test**: Read backwards sentence by sentence. "If I delete this, does the output still work?" → yes → delete.

---

## §8 — MULTI-TURN TOKEN DECAY

Context windows grow unboundedly across turns. Without active management, early-turn content consumes tokens contributing zero signal. Enforce decay:

```text
STRATEGY_1: SLIDING SUMMARY
  Trigger: context_window × 0.4 reached.
  turns[0..current-3] → compress to structured summary:
    DECISIONS_MADE: [key-value list]
    ARTIFACTS_CREATED: [file paths]
    CURRENT_STATE: [1-2 sentences]
    OPEN_ISSUES: [list]
  ¬(verbatim dialogue) ¬(dead-end reasoning)
  KEEP VERBATIM: last 2-3 turns (recency bias).

STRATEGY_2: ARTIFACT EXTERNALIZATION
  if content is referenceable (code, config, schema):
    → write to file → replace in-context with pointer: "See artifact: [path]" (3 tokens vs 500+)
  ¬(keeping full file contents in context after written to disk)

STRATEGY_3: SIGNAL DECAY CLASSIFICATION
  SIGNAL_HIGH (decisions, constraints, preferences) → KEEP (compress to key-value if verbose)
  SIGNAL_MED  (intermediate results, partial outputs) → KEEP until superseded → DROP
  SIGNAL_ZERO (greetings, acks, failed attempts)     → DROP on next compression cycle
```

**Anti-pattern detection:**

```text
- Same code block 2+ times → deduplicate, keep latest
- Error trace + fix applied → drop the trace
- "As I mentioned earlier..." → context is bloated
- Tool results > 500 tokens from 3+ turns ago → summarize ⊕ drop
```

**Rule**: `context_utilization = signal_tokens / total_tokens`. Target: ≥ 0.7. Below 0.5 → trigger STRATEGY_1 immediately.

---

## §9 — SURGICAL AUDIT & BENCHMARKING (Ockham-Tester)

The Razor must prove it cuts fat, not muscle. Use this protocol to measure and validate efficiency:

### 9.1 — Core Metrics

```text
Compression Ratio   = 1 - (Tokens_Razor / Tokens_Base)      Target: 40% - 87%
Logical Fidelity    = Correct_Steps / Total_Required          Target: 1.0 (exact)
Intelligence Density = Fidelity / log₁₀(Tokens + 1)          Target: Maximize (ordinal, self-comparison only)
Context Utilization  = Signal_Tokens / Total_Tokens           Target: ≥ 0.7
```

### 9.2 — Safety Invariants

```text
INVARIANT_1: Fidelity < 1.0 ⇒ Razor is too sharp.
  → Revert to §3.3 Progressive Disclosure (add back LAYER_1 content)
  → Identify which compression step dropped essential signal
  → ¬(optimizing further until fidelity restored)

INVARIANT_2: Compression Ratio < 0.2 ⇒ Razor is too dull.
  → Re-audit with §7 Validation Checklist
  → Check: suppression block present? symbols used? essays removed?

INVARIANT_3: User requests clarification on optimized output ⇒
  → Signal that compression damaged readability
  → Restore natural language for THAT specific section
  → Log pattern to avoid over-compressing similar content
```

### 9.3 — Benchmark Protocol (A/B Validation)

When validating Razor effectiveness on a new prompt or workflow:

```text
STEP_1: Generate Tokens_Baseline
  → Write/run the prompt WITHOUT Razor transforms
  → Record: token count, output correctness, format compliance

STEP_2: Apply full Razor pipeline (§3 → §4 → §8)
  → Record: Tokens_Razor, output correctness, format compliance

STEP_3: Compute metrics
  → Compression Ratio = 1 - (Tokens_Razor / Tokens_Baseline)
  → Fidelity = compare outputs (same result? same structure?)

STEP_4: Verdict
  if Fidelity == 1.0 ∩ Compression ≥ 0.4:
    → PASS. Razor effective.
  if Fidelity == 1.0 ∩ Compression < 0.4:
    → MARGINAL. Review for missed optimizations.
  if Fidelity < 1.0:
    → FAIL. Revert. Identify destructive transform.
```

**Rule**: ¬(claiming optimization without measurement). Assertion without data = noise.
