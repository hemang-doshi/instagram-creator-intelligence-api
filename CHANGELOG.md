# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-24

### Added

- First public release of a read-only Instagram creator analytics API for Custom GPT Actions
- Six HTTP endpoints covering service health, OpenAPI schema, profile analytics, recent media, per-media insights, and a Reel-first report
- OpenAPI 3.1 schema designed for ChatGPT Actions import
- Meta-aware client-side rate limiting with response header feedback
- In-memory TTL caching and CDN-friendly response caching for repeated reads
- Vercel-ready deployment flow with no database dependency

### Guarantees

- Read-only behavior with no publishing or mutation endpoints
- No database or long-term user-data storage requirement
