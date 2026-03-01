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

## Architecture

This is an MCP (Model Context Protocol) server that provides AI assistants access to Amazon Advertising APIs for campaign management.

### Core Components

- **`src/index.ts`** - MCP server definition and tool handlers. Defines 7 tools (get_profiles, get_campaigns, get_campaign_performance, get_keywords, update_keyword_bid, create_campaign, get_product_ads) with JSON schema validation. Tool execution via switch statement returning JSON responses.

- **`src/amazon-ads-client.ts`** - Amazon Ads API client wrapper. Handles token management with auto-refresh (1 min before expiry), region-based endpoint routing (NA/EU/FE), and sandbox mode support. All API calls go through this class.

- **`src/get-refresh-token.ts`** - Standalone OAuth 2.0 helper. Spawns local HTTP server on port 3000 to capture OAuth callback and exchange authorization code for refresh token.

### Adding New Tools

1. Add tool definition to the `tools` array in `index.ts` with name, description, and inputSchema
2. Add case to the switch statement in the CallToolRequest handler
3. Implement API method in `amazon-ads-client.ts` if needed

### Environment Configuration

Required variables in `.env`:
- `AMAZON_ADS_CLIENT_ID` / `AMAZON_ADS_CLIENT_SECRET` / `AMAZON_ADS_REFRESH_TOKEN`
- `AMAZON_ADS_REGION` (NA/EU/FE, default: NA)
- `AMAZON_ADS_SANDBOX` (true for testing)

## Known Limitations

- `getCampaignPerformance` is simplified; production should use async reporting API with polling
- No rate limiting or retry logic implemented
- No test suite exists
