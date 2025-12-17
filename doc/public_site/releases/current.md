# Current Release

**Version**: 1.0.0
**Release Date**: December 2025

## Overview

Initial release of Your Trusted Planner, the estate planning portal for attorneys and clients.

## New Features

### Journey System
- Create and manage journey templates with milestones and bridge steps
- Track client progress through multi-step workflows
- Support for both attorney and client action items
- Bridge conversations for iterative review cycles

### Document Management
- Document template system with variable placeholders
- Generate documents from templates with auto-populated client data
- Electronic signature support
- Document upload and review workflow
- Integration with PandaDoc for advanced signing and notarization

### Client Management
- Client profiles with detailed contact and family information
- Client status tracking (Prospect → Active)
- Internal notes and activity logging
- Assign attorneys to clients

### Matters & Services
- Service catalog for defining offerings
- Matter management for client cases
- Link services to matters
- Fee tracking and payment status

### Appointments
- Schedule appointments with clients
- Calendar integration with Google Calendar
- Appointment status tracking

### Help System
- Built-in help center for attorneys and clients
- Context-aware documentation
- FAQ library

## Technical Highlights

- **Platform**: Cloudflare Workers (edge deployment)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (documents)
- **Cache**: Cloudflare KV (sessions, tokens)
- **Queues**: Cloudflare Queues (async processing)

## Integrations

- **PandaDoc** - Document signing and notarization
- **LawPay** - Payment processing
- **Google Calendar** - Attorney calendar sync
- **OpenAI** - AI-powered client assistance

## Known Limitations

- Email notifications require additional configuration
- Calendar sync is one-way (YTP to Google)
- Maximum file upload size is 10MB

## Coming Soon

- Two-way calendar synchronization
- Enhanced reporting and analytics
- Mobile-optimized experience
- Additional payment gateway options
