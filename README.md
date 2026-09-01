Absolutely. Since **Crux AI is now the official name and the repository is live on GitHub**, this is the right time to replace the basic README with something that feels like a serious AI company / engineering project.

I’d make the README communicate four things immediately:

**What Crux is → what it can do → how it is built → where it is going.**

Use this as the new `README.md`:

````markdown
# Crux AI

<p align="center">
  <strong>Intelligence at the crux.</strong>
</p>

<p align="center">
  An intelligent AI platform for reasoning, research, analysis, creation, and software development.
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#capabilities">Capabilities</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#technology-stack">Technology Stack</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#development">Development</a>
</p>

---

> **Status: 🚧 Active Development**

Crux AI is an AI platform being engineered around a multi-model intelligence architecture, project-aware workflows, reasoning, research, multimodal interaction, and advanced software-development capabilities.

The goal is simple:

**Build an AI platform that can understand the problem, reason about it, and help users move from idea to execution.**

---

## Overview

Crux AI is designed as a unified environment for working with modern AI systems.

Rather than depending on a single model, Crux is built around a provider- and model-aware architecture that allows different models to be used according to their capabilities, availability, user plan, and task requirements.

Crux is being developed to support:

- General AI conversation
- Advanced reasoning
- Technical analysis
- Research workflows
- Multimodal image understanding
- Project and workspace context
- Software-development workflows
- Model-aware routing
- Persistent user and project context
- Real-time application experiences

The long-term objective is to evolve Crux from an AI chat application into a **general-purpose intelligent work environment**.

---

# Core Capabilities

## Multi-Model Intelligence

Crux is designed to work across multiple AI providers and models rather than being locked to a single model family.

The platform maintains a model registry containing information such as:

- Model identity
- Provider
- Plan availability
- Context capabilities
- Vision support
- Reasoning support
- Provider configuration
- Availability

This allows Crux to select and use appropriate models while preserving explicit user model selection when required.

---

## Reasoning

Crux supports model-aware reasoning controls.

Reasoning is treated separately from final-answer length so that the system can distinguish between:

- How deeply a model should reason
- How detailed the final response should be

The reasoning architecture is designed to support different model/provider implementations rather than assuming that every provider exposes reasoning in the same way.

Crux does not expose private chain-of-thought to users.

---

## Multimodal AI

Crux supports image-based interactions with vision-capable models.

The multimodal pipeline is designed around:

- Image attachment
- Fast local preview
- Background upload
- Vision capability detection
- Secure storage
- Signed access
- Model-aware image routing
- Multi-turn image context

This allows users to work with screenshots, diagrams, documents, interfaces, and other visual material.

---

## Research & Knowledge

Crux is being designed to support research-oriented workflows in which users can combine AI reasoning with project-specific information.

Future knowledge capabilities are intended to support:

- Documents
- Books
- Research papers
- Technical documentation
- Project material
- Structured knowledge
- Persistent project context
- Source-aware retrieval

The long-term goal is a knowledge layer that can work independently of the underlying model provider.

---

## Workspaces

Crux is designed around the idea that AI work should happen inside persistent contexts rather than isolated conversations.

Workspaces are intended to provide:

- Projects
- Files
- Documents
- Research material
- Persistent context
- Structured workflows
- AI-assisted tasks

---

# Architecture

Crux follows a direct model-routing architecture.

```text
                    USER
                     │
                     ▼
              CRUX APPLICATION
                     │
                     ▼
             APPLICATION STATE
                     │
                     ▼
              REQUEST PIPELINE
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      AUTO MODE          MANUAL MODEL
          │                     │
          └──────────┬──────────┘
                     ▼
              MODEL REGISTRY
                     │
                     ▼
             PROVIDER ADAPTER
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      OpenRouter   Groq       Gemini
          │
          ▼
      AI MODEL
          │
          ▼
      STREAMING RESPONSE
          │
          ▼
          CRUX UI
````

Crux is built around **direct model routing**.

Legacy agent-based routing is not part of the current architecture.

---

# Current Product Architecture

```text
Crux AI
│
├── Chat
│   ├── General conversation
│   ├── Reasoning
│   ├── Multimodal input
│   └── Model selection
│
├── Work
│   ├── Research
│   ├── Projects
│   ├── Documents
│   └── Workflows
│
├── Intelligence
│   ├── Model Registry
│   ├── Model Routing
│   ├── Reasoning
│   ├── Vision
│   └── Provider Abstraction
│
├── Account
│   ├── Authentication
│   ├── Plans
│   ├── Usage
│   └── Settings
│
└── Infrastructure
    ├── Supabase
    ├── PostgreSQL
    ├── Storage
    ├── Realtime
    └── API Services
```

---

# Technology Stack

## Frontend

* React
* TypeScript
* TSX
* TanStack Router
* TanStack Start
* TanStack Query
* Tailwind CSS
* Radix UI
* shadcn/ui
* Framer Motion
* React Markdown
* Recharts
* i18next

## Backend

* TypeScript
* TanStack Start server routes/functions
* Server-side API handlers
* Streaming responses
* SSE / ReadableStream
* Zod validation

## Database & Backend Services

* PostgreSQL
* Supabase
* Supabase Auth
* Supabase Storage
* Row Level Security (RLS)
* Database RPC functions
* Database migrations
* Supabase Realtime

## AI Infrastructure

* OpenRouter
* Groq
* Google Gemini
* Multi-model registry
* Provider abstraction
* Model-aware routing
* Streaming AI responses
* Vision-capable models
* Reasoning-capable models

## Development

* Bun
* Vite
* TypeScript
* Vitest
* Git
* GitHub

---

# Security

Security is treated as a first-class part of the Crux architecture.

Current and planned security mechanisms include:

* Authentication
* Authorization
* Role-based access control
* PostgreSQL Row Level Security
* Secure API authentication
* Signed storage URLs
* Secret isolation
* Quota enforcement
* Rate limiting
* Audit logging
* Secure file handling
* Tenant/user isolation

Sensitive credentials and API keys must never be committed to the repository.

---

# Plans & Usage

Crux is designed around multiple user tiers with different access levels to models, capabilities, and usage limits.

Current planned tiers:

```text
Free
Standard
Pro
Pro+
```

Each tier is intended to provide meaningful AI capability rather than simply limiting the user through arbitrary feature restrictions.

The platform is designed to provide access to increasingly capable models, larger workloads, advanced reasoning, and professional tools while maintaining an affordable pricing strategy.

---

# Development Philosophy

Crux is being engineered around several core principles.

### 1. Capability over hype

Features should provide real utility rather than exist only as marketing features.

### 2. Model-agnostic architecture

Crux should not depend on a single model or provider.

### 3. User-controlled intelligence

Manual model selection should remain authoritative.

### 4. Verification over assumption

The platform should distinguish between:

```text
Configured
Supported
Available
Working
Verified
```

### 5. Minimal sufficient change

For engineering workflows, the system should prefer the smallest safe change that actually solves the problem.

### 6. Security first

User data, credentials, project files, and provider keys must be treated as protected resources.

### 7. Performance matters

AI systems should not only be intelligent. They should also be responsive, predictable, and efficient.

---

# Roadmap

## Phase 1 — Core Platform

* [x] Multi-model architecture
* [x] Direct model routing
* [x] Authentication
* [x] Daily usage limits
* [x] Model selection
* [x] Streaming responses
* [x] Image input
* [x] Vision capability handling
* [x] Reasoning controls
* [x] Administrative analytics foundation
* [x] Theme system
* [ ] Production-grade reasoning optimization
* [ ] Advanced response optimization

## Phase 2 — Intelligence

* [x] Advanced model selection
* [x] Task-aware reasoning
* [x] Improved context management
* [x] Persistent project context
* [x] Knowledge ingestion
* [x] Retrieval pipeline
* [x] Research workflows
* [x] Source-aware answers
* [x] Improved multimodal workflows

## Phase 3 — Professional Workspaces

* [x] Advanced Workspaces
* [x] Project intelligence
* [x] Document intelligence
* [x] Research environments
* [x] Creative workflows
* [x] UI/UX analysis workflows
* [x] Long-running tasks

## Phase 4 — Crux Code

Crux Code is planned primarily for the native Windows/macOS application.

The future engineering environment is intended to support:

```text
Repository
   ↓
Understand
   ↓
Analyze
   ↓
Plan
   ↓
Edit
   ↓
Run
   ↓
Debug
   ↓
Test
   ↓
Build
   ↓
Preview
   ↓
Verify
```

Planned capabilities include:

* Project-aware coding
* Repository analysis
* File system integration
* Intelligent code search
* Debugging
* Minimal targeted fixes
* Diff review
* Terminal execution
* Build/test workflows
* Git integration
* Local project execution
* Sandboxed execution
* Live preview

---

# Desktop Applications

Crux is also being developed toward native applications for:

* Windows
* macOS

The desktop architecture will eventually allow Crux Code and other advanced capabilities to interact with the local development environment in a controlled and secure manner.

The desktop version is intended to provide capabilities that are difficult or inappropriate to reproduce fully inside a browser-only environment.

---

# Repository Structure

A simplified view of the current project:

```text
src/
├── components/
│   ├── arch/
│   └── ui/
│
├── lib/
│   ├── ai/
│   ├── model-registry/
│   ├── state/
│   ├── intelligence/
│   └── utilities/
│
├── routes/
│   ├── api/
│   └── application routes
│
└── styles/
```

The exact structure may evolve as Crux develops.

---

# Development

## Requirements

* Bun or compatible Node.js environment
* Git
* Supabase project
* Required provider/API credentials

## Install

```bash
bun install
```

## Development server

```bash
bun dev
```

## Build

```bash
bun run build
```

## Tests

```bash
bun test
```

> Available scripts may change as development progresses. Use the project's current `package.json` scripts as the source of truth.

---

# Environment Variables

Crux requires provider and infrastructure configuration through environment variables.

Never commit:

```text
.env
.env.local
API keys
provider secrets
database passwords
authentication secrets
```

Use the project's environment configuration system for local development.

---

# Project Status

Crux AI is currently under active development.

The platform is evolving rapidly, and architecture, interfaces, model availability, and capabilities may change as the project progresses.

This repository represents an active engineering project rather than a finished commercial release.

---

# Vision

Crux is being built around a simple idea:

> **AI should not only answer questions. It should help people understand problems, reason through complexity, create solutions, and turn those solutions into working systems.**

The long-term vision is to build an AI platform that brings together:

**Conversation + Reasoning + Research + Knowledge + Creation + Engineering**

into one environment.

---

# Contributing

Crux is currently under active development.

Contribution policies may be introduced as the project approaches a wider public release.

For now, issues and architectural discussions should focus on reproducible problems, concrete improvements, security concerns, and technically grounded proposals.

---

# Security Disclosure

If you discover a security vulnerability, please do not publicly disclose sensitive details through a GitHub issue.

A dedicated security reporting process will be established as Crux approaches production release.

---

# License

License information will be finalized before the public production release.

---

<p align="center">
  <strong>Crux AI</strong><br>
  Intelligence at the crux.
</p>
```

### One change before you commit it

I would **not blindly paste the “current technology” sections exactly as written above** without checking your repository one more time. Your earlier audit confirmed the stack broadly, but your codebase has been changing rapidly, and some architecture has already moved since that audit.

Especially these areas should reflect the **actual current repository**:

`Repository Structure`, `AI Infrastructure`, `Plans & Usage`, `Phase 1`, and the exact package-manager commands.

The README should be **truthful as of the current commit**, not a roadmap disguised as current functionality.

For the GitHub repository, I'd also add these files next:

```text
README.md
LICENSE
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
.github/
├── ISSUE_TEMPLATE/
└── workflows/
```

That will make the repository feel much more like the foundation of a real company rather than a project dump.
