# Architecture Overview

Your Trusted Planner (YTP) is an estate planning portal built on modern serverless architecture. This section provides technical documentation for developers and stakeholders.

## Documentation Levels

We use the [C4 Model](https://c4model.com/) to document architecture at different levels of abstraction:

| Level | Audience | Purpose |
|-------|----------|---------|
| **Context** | Everyone | Shows the system, users, and external dependencies |
| **Container** | Technical stakeholders | Shows the high-level technical building blocks |
| **Component** | Developers | Shows internal structure of containers |

## Key Documents

### [C4 Architecture Diagrams](./c4-diagrams)
Visual diagrams at Context, Container, and Component levels showing:
- System users (Attorneys, Clients, Administrators)
- External integrations (PandaDoc, LawPay, Google Calendar, OpenAI)
- Infrastructure (Cloudflare Workers, D1, R2, KV, Queues)
- API module structure and data flows

### [Entity Relationship Diagram](./entity-relationships)
Complete database schema documentation showing:
- 25+ database tables
- Relationships and foreign keys
- Field types and constraints
- Logical groupings (Users, Matters, Documents, Journeys, etc.)

### [DOCX Processing Architecture](./docx-processing)
Technical deep-dive into document processing:
- Queue-based async processing
- Content extraction pipeline
- Variable detection in templates

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Nuxt 4, Vue 3, Tailwind CSS |
| **Backend** | Nitro, TypeScript, H3 |
| **Database** | Cloudflare D1 (SQLite), Drizzle ORM |
| **Storage** | Cloudflare R2 |
| **Cache** | Cloudflare KV |
| **Queues** | Cloudflare Queues |
| **Hosting** | Cloudflare Workers |

## External Integrations

| Service | Purpose |
|---------|---------|
| **PandaDoc** | E-signatures, document templates, notarization |
| **LawPay** | Legal payment processing, trust accounting |
| **Google Calendar** | Attorney calendar sync, appointment scheduling |
| **OpenAI** | AI-powered client assistance |

## Domains

The application is deployed to:
- `app.businessandlegacy.com`
- `app.trustandlegacy.com`
