# Hospital / Healthcare IT Gap Analysis — RevStack

## Scope
This analysis identifies gaps that must be closed to add healthcare / medical trade clients (hospitals, diagnostic labs, medical device distributors, pharmaceutical traders) to Mapato.

---

## 1. Compliance Gaps

| Gap | Current state | Required for healthcare trade | Notes |
|-----|---------------|-------------------------------|-------|
| Incoterms completeness | Generic trade support (FOB, CIF, EXW) | Add FCA, DDP, CIP corridors with medical commodity routing | FCA preferred for containerised medical equipment forwarding |
| Sanctions / end-use controls | No special screening | Vetting of destination hospitals against denied-party lists | Iran, NK, Sudan embargos affect medical trade moral-licensing exceptions |
| Export licences (pharma & devices) | Not tracked | Classify commodity HS codes (e.g., 9018, 9021, 3004) and route via questionnaires |过敏 |
| ISO 13485 (QMS) supplier onboarding | Not supported | Add `qms_certified`, `mdr_compliant` fields to vendor profile | Required for EU/UK medical device corridors |
| GDP (Good Distribution Practice) | Not modelled | Cold-chain corridor flags, 2–8°C / -20°C compliance indicators | Rwanda, Kenya, EU corridors need GDP声明 |
| FDA / CE marking | Not referenced | Product registry fields: `fda_510k`, `ce_marking_class` (Ia / IIa / IIb) | Impacts corridor validity (e.g. FDA-registered devices only from listed importers in US) |

## 2. Data Privacy Gaps (HIPAA / GDPR / PHI)

| Gap | Current state | Required |
|-----|---------------|----------|
| PHI classification | No PHI concept in data model | Add `data_classification` enum: `public`, `internal`, `restricted`, `phi` |
| Patient data handling | Not applicable in B2B trade | Explicitly disallow PHI fields in shipment notes / RFQ documents; warn and redact |
| GDPR health data | Not addressed | Require DPA (Data Processing Agreement) signing flow before EU patient-adjacent data entity can onboard |
| Audit trail | Basic CRM audit | Immutable access log for any record with `phi` classification touching the platform |
| Encryption at rest | DB-level only | Column-level encryption for `patient_count`, `ward_volume`, `diagnostic_volume` type fields |

## 3. Integration Gaps

| Gap | Current state | Required for healthcare clients |
|-----|---------------|---------------------------------|
| EDI / HL7 ingest | Not supported | Inbound HL7 ORU / ORM for lab orders to trigger procurement RFQs automatically |
| ERP integration (SAP IS-H, Oracle Health) | Generic CRM sync | Healthcare-specific field maps: cost centre, purchase group, material number (SAP MM), GL account |
| Catalogue / GUDID | Generic product catalogue | Medical Device Unique Device Identification attributes: UDI-DI, GTIN, expiry, sterile flag |
| Lot / batch traceability | Not modelled | Add `lot_number`, `expiry_date`, `sterile_status`, `cold_chain_required` to line-item schema |
| Regulatory field verification | None | HM Releasable / BtmF / NCSL integration strings for customs pre-clearance on medical supplies |

## 4. Security & Access Control Gaps

| Gap | Current state | Required |
|-----|---------------|----------|
| Role model | Basic admin / user roles | Add `procurement_officer`, `ward_manager`, `biomedical_engineer`, `regulatory_affairs`, `qa_officer` roles |
| Segregation of duties | Not enforced | Procurement officer cannot self-approve high-value device orders > threshold |
| BAA / DPA signing flow | Not implemented | In-app agreement signing with audit trail before healthcare tenant activates trade flows |
| Pen test scope | Generic B2B targets | Healthcare-specific pen test inclusion: medical device data, patient-adjacent procurement volumes |

## 5. Product / UX Gaps

| Gap | Current state | Required |
|-----|---------------|----------|
| Lead/corridor scoring domain vocabulary | B2B trade language (ERP, logistics, invoicing) | Medical trade vocabulary: tenders, formulary, consignment stock, loaner instruments |
| Onboarding checklist | Generic trade | Compliance-first checklist: ISO 13485 evidence, import licences, cold-chain capability attestation |
| Reporting | Pipeline / revenue reports | Add: tenders in pipeline, device lifecycle coverage, regulatory approval status per corridor |
| Notification rules | Invoice + shipment alerts | Add: licence expiry, GDP audit window, sterile batch recall alerts |

## 6. Priority Recommendations

1. **Severity: Critical** — Add PHI data classification, DPA flow, and immutable audit trail before storing any patient-adjacent metrics.
2. **Severity: High** — Extend product catalogue and line-item schema with UDI, expiry, batch, and cold-chain fields.
3. **Severity: High** — Begin corridor compliance corpus enrichment (GDP, export licence checklists) for top three medical trade corridors.
4. **Severity: Medium** — Revise lead scoring prompt (`src/lib/llm-lead-scoring.ts`) with healthcare trade factors (tender size, formulary inclusion, regulatory urgency).
5. **Severity: Medium** — Add healthcare-specific enterprise integration connectors (SAP IS-H field map prototype, HL7 ORU listener).
6. **Severity: Low** — Introduce medical trade terminology in UI / AI prompts once data model is secured.

---

## Cross-References
- AI training plan: `docs/ai-training-plan.md`
- Scoring engine: `src/lib/llm-lead-scoring.ts`
- LangChain / RAG service: `src/lib/langchain-service.ts`
- Lead qualification rules: `src/lib/qualify-lead.ts`

## Risk Note
Handling medical trade data may trigger additional licensing (medical device dealer licence, pharmacy licence) depending on jurisdiction. Engage regulatory counsel before onboarding hospital / medical trade clients in each target market.
