# Metrixcom Engine: Full LLM Alignment Plan

This plan standardizes the **Nemotron 3** lineup across all platform layers (Core, Admin, UI, and Documentation) as requested.

### User Impact
- **Consistency:** All settings, reports, and admin views will reflect the accurate Nemotron 3 model names and parameters.
- **Improved Transparency:** The Intelligence report and Admin panel will match the actual routing logic used by the Metrixcom Engine.

### Technical Details
- **Core Intelligence (`src/lib/intelligence.ts`):** Update `PreferredModel` type and labels to match the new tiered hierarchy.
- **Routing Engine (`src/lib/model-chains.ts`):** Standardize internal constants and the `PreferredModel` resolution logic.
- **Security Proxy (`src/routes/api/ai-stream.ts`):** Update comments and model mappings in the server-side failover logic.
- **Admin Dashboard (`src/routes/admin.tsx`):** Align the "Models" tab UI with the new Nemotron 3 naming conventions.
- **Documentation (`llm-intelligence-report.md`):** Refresh the report to serve as the single source of truth for the founder and users.

### Execution Steps

1. **Update Intelligence Types & Labels**
   - Standardize `MODEL_LABEL` in `src/lib/intelligence.ts` for all tiers.

2. **Align Routing Logic**
   - Refactor `src/lib/model-chains.ts` to use consistent naming for `LOVABLE_NEMOTRON_*` constants.

3. **Update Server-Side Proxy**
   - Synchronize `ALLOWED_MODELS` mappings and code comments in `src/routes/api/ai-stream.ts`.

4. **Synchronize Admin UI**
   - Update the `Models` tab in `src/routes/admin.tsx` to display the correct tier names and descriptions.

5. **Finalize Documentation**
   - Update `llm-intelligence-report.md` with the latest model details.
