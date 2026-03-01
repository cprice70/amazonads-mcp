# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build      # Compile TypeScript to build/
npm run watch      # Watch mode compilation
npm run start      # Run compiled server (build/index.js)
npm run dev        # Compile and run in one command
npm run get-token  # OAuth token acquisition helper
```

## Testing

```bash
npx @modelcontextprotocol/inspector node build/index.js
```
Opens web UI at http://localhost:6274 to test tools interactively.

## Architecture

This is an MCP (Model Context Protocol) server that provides AI assistants access to Amazon Advertising APIs for campaign management.

### Core Components

- **`src/index.ts`** - MCP server definition and tool handlers. Defines 9 tools with JSON schema validation. Tool execution via switch statement returning JSON responses.

- **`src/amazon-ads-client.ts`** - Amazon Ads API v3 client wrapper. Handles:
  - Token management with auto-refresh (1 min before expiry)
  - Region-based endpoint routing (NA/EU/FE)
  - Sandbox mode support
  - Retry logic with exponential backoff (3 retries for 429/5xx errors)
  - Async report polling and GZIP decompression

- **`src/get-refresh-token.ts`** - Standalone OAuth 2.0 helper. Spawns local HTTP server on port 3000 to capture OAuth callback and exchange authorization code for refresh token.

### Available Tools

| Tool | Description |
|------|-------------|
| `get_profiles` | List advertising profiles/accounts |
| `get_campaigns` | List campaigns (filter by state/type) |
| `get_keywords` | List keywords (filter by campaign/ad group) |
| `get_product_ads` | List product ads |
| `get_campaign_performance` | Create async performance report |
| `get_report` | Check status and download completed reports |
| `create_campaign` | Create campaign (defaults to PAUSED) |
| `update_keyword_bid` | Update keyword bid amount |
| `archive_campaign` | Archive/delete a campaign |

### API Version

Uses Amazon Ads API v3 with versioned Content-Type headers:
- Sponsored Products: `application/vnd.spcampaign.v3+json`
- Sponsored Brands: `application/vnd.sbcampaignresource.v4+json`
- Sponsored Display: `application/vnd.sdcampaign.v3+json`
- Reporting: `application/vnd.createasyncreportrequest.v3+json`

### Adding New Tools

1. Add tool definition to the `tools` array in `index.ts` with name, description, and inputSchema
2. Add case to the switch statement in the CallToolRequest handler
3. Implement API method in `amazon-ads-client.ts` if needed

### Environment Configuration

Required variables in `.env`:
- `AMAZON_ADS_CLIENT_ID` / `AMAZON_ADS_CLIENT_SECRET` / `AMAZON_ADS_REFRESH_TOKEN`
- `AMAZON_ADS_REGION` (NA/EU/FE, default: NA)
- `AMAZON_ADS_SANDBOX` (true for testing - note: sandbox API often unavailable)

## Known Limitations

- Sandbox API is frequently unavailable (503 errors)
- No test suite exists
- `get_campaign_performance` returns all campaigns; client-side filtering by campaignId
