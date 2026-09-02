# Metrixcom Engine LLM Intelligence Report

This report details the primary and failover Large Language Model (LLM) configurations across the Metrixcom platform. The **Metrixcom Engine** employs a multi-provider failover architecture to ensure maximum reliability and intelligence depth.

## 1. Intelligence Routing Architecture
The platform does not rely on a single model. Instead, it uses a **Failover Chain** for every request.
*   **Primary Provider:** Lovable AI Gateway (Reliable, high-speed primary).
*   **Secondary Providers:** Groq (Ultra-fast inference), Google Gemini (Advanced reasoning).

## 2. Plan-Specific Intelligence Assignments

The following LLMs are assigned based on user plan and the selected **Effort Tuning** level in Settings > Intelligence.

### Free Plan
*   **Primary:** Nemotron 3 Nano (30B-A3B)
*   **Secondary Failover:** Gemini 2.0 Flash (Google), Llama 3.1 8B (Groq).
*   **Limits:** Standard free tier usage limits apply.

### Standard Plan
*   **Primary:** Nemotron 3 Nano (30B-A3B)
*   **Secondary Failover:** Gemini 2.0 Flash (Google), Llama 3.3 70B (Groq).
*   **Limits:** Increased usage limits compared to Free tier.

### Pro Plan
*   **Primary:** Nemotron 3 Super (120B-A12B)
*   **Secondary Failover:** Nemotron 3 Nano (Failover), Gemini 2.0 Flash.

### Pro+ Plan
*   **Primary:** Nemotron 3 Ultra (550B-A55B)
*   **Secondary Failover:** Nemotron 3 Super (Failover), Gemini 2.0 Flash.

## 3. Specialized Agent Capabilities

| Agent | Module | Target Capability | Primary Model |
| :--- | :--- | :--- | :--- |
| **Pulse-1** | General | Quick assistance & Search | Nemotron 3 Nano |
| **Forge-1** | Engineering | Coding & Architecture | Nemotron 3 Super/Ultra |
| **Cipher-1** | Security | Pentest & Research | Nemotron 3 Super/Ultra |

## 4. Metrixcom Engine Settings
*   **Thinking Mode:** Enabled by default for all premium plans, providing visible reasoning steps.
*   **Creativity Slider:** Adjusts temperature (0.0 to 1.0) across all providers.
*   **Effort Tuning:** Dynamically scales model parameters and reasoning depth.

---
*Report generated for founder Athul Krishna PT — Metrixcom Infrastructure.*
