# AI Training Plan — RevStack

## 1. Lead Scoring Fine-Tuning

### Current implementation
`src/lib/llm-lead-scoring.ts` uses a zero-shot ChatPromptTemplate to score leads across five factors (intent_signals, company_fit, engagement_quality, timeline_budget, source_credibility). Score is blended 70% LLM / 30% rule-based with fallback to `qualifyLead()`.

### Training data sources
- Historical lead records from the CRM (qualified / disqualified outcomes).
- Contact records enriched with source, notes, product interest, budget, timeline, and inquiry text.
- Opportunities where rule-based score diverges from manual sales rep tier assignment.

### Anchor examples
Per-factor labelled examples (score 0-100 + reasoning) covering:
- Cold outreach with no intent signals.
- Hot leads with explicit budget + timeline + referral source.
- Lukewarm leads with incomplete data.

### Fine-tuning goals
- Reduce false-positives (over-scored lukewarm leads becoming "hot").
- Improve recognition of B2B trade automation buyer intent (ERP, logistics, e-invoicing corridors).
- Tighten tier calibration: target ≥75% accuracy against gold-label rep assessments on a held-out validation set.

### Evaluation metrics
- Tier accuracy (coarse): hot / qualified / lukewarm / cold vs. ground truth.
- Per-factor MAE (mean absolute error) vs. human-annotated factor scores.
- Calibration: percentage of leads in "hot" tier that actually close.
- LLM-on vs. rule-only A/B comparison using blended-score lift over rule baseline.

---

## 2. Corridor Matching Training Data

### Concept
Mapato routes trade flows across "corridors" (country-pair trade lanes with commodity, incoterm, and logistics constraints). Corridor matching should predict best-fit corridor from lead attributes + trade context.

### Data to collect
- Past shipments / RFQs with loaded corridor, origin, destination, commodity HS category, volume, incoterm.
- Lead company profile signals: trading licenses, registered markets, typical supplier/customer regions.
- User behavior: corridors searched, corridors bookmarked, corridors converted to shipment.

### Feature schema
- `origin_country`, `dest_country`, `commodity_category`, `volume_band`, `incoterm_preference`.
- `lead_industry`, `company_size`, `past_trade_countries`, `lead_region`.
- `source_credibility`, `timeline_urgency`.

### Training format
- Supervised classification: label each (lead + trade context) pair with `chosen_corridor` from historical booked shipments.
- Negative sampling: 3–5 ineligible corridors per positive example.

### Evaluation metrics
- Top-1 corridor accuracy.
- Top-5 corridor recall@k (commercial acceptability).
- Coverage: % of active trade lanes covered by model recommendations.

---

## 3. Compliance RAG Corpus

### Purpose
Retrieval-augmented generation to surface relevant compliance requirements (incoterm rules, export controls, sanctions lists, customs documentation, transit corridor agreements) during lead scoring and corridor matching.

### Corpus sources
- Incoterms® 2020 definitions and obligation matrices.
- Country-specific export documentation checklists (Kenya, Rwanda, DRC, UAE, EU).
- Sanctions / restricted party lists (OFAC, EU, UN) summarized in structured form.
- Internal Mapato playbooks: corridor-specific customs requirements and tariff band notes.

### Ingestion pipeline
- Chunk at ~500 tokens with overlap of 50 tokens.
- Embed with the project's default embeddings model (`src/lib/langchain-service.ts`).
- Index in a persistent `PersistenceVectorStore` (not `MemoryVectorStore`) with headers: `doc_type`, `corridor`, `jurisdiction`, `effective_date`, `last_verified`.

### Retrieval scoping
- For lead scoring: retrieve compliance complexity signals that influence timeline_budget and source_credibility factors.
- For corridor matching: retrieve corridor-specific filing requirements and restrict recommendations to compliant corridors when sanctions / embargo flags are present.

### Evaluation metrics
- Retrieval recall@5 for planted compliance queries in a golden test set.
- Groundedness: % of retrieved chunks cited by the LLM in generated responses.
- Regulatory coverage: % of supported corridors with an up-to-date compliance corpus entry.

---

## 4. Unified Evaluation & Monitoring

### Offline evaluation
- Quarterly holdout evaluation on new lead / shipment data since last release.
- Per-tenant leaderboard for B2B trade vs. medical trade verticals.

### Online monitoring
- Log LLM factor scores and rule-based fallback triggers.
- Alert when `llmEnabled === false` rate exceeds 5% over a rolling 24h window.
- Track corridor recommendation acceptance rate post-deployment.

### Retraining cadence
- Lead scoring: monthly fine-tuning on new labelled outcomes.
- Corridor matching: quarterly retrain as trade lane volumes and commodity mix evolve.
- Compliance corpus: weekly re-validation of effective dates; ingestion of new regulatory updates within 72h.

---

## Dependencies
- Label pipeline (`src/lib/qualify-lead.ts` rule engine) as golden baseline.
- Model provider abstraction (`src/lib/model-provider.ts`) for consistent embeddings + LLM config across services.
- Vector store upgrade: replace `MemoryVectorStore` with a persistent backend before RAG goes to production (see `src/lib/langchain-service.ts:15`).
