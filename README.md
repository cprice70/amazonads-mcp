# Amazon Ads MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the Amazon Advertising API. This server enables AI assistants to access and manage Amazon Ads campaigns, keywords, performance data, and more.

## Features

This MCP server provides the following tools:

- **get_profiles**: List all available Amazon Ads profiles/accounts
- **get_campaigns**: Retrieve advertising campaigns with optional filtering by state and type
- **get_campaign_performance**: Get performance metrics for campaigns (impressions, clicks, cost, sales)
- **get_keywords**: Retrieve keywords for campaigns or ad groups
- **update_keyword_bid**: Update bid amounts for specific keywords
- **create_campaign**: Create new advertising campaigns
- **get_product_ads**: Retrieve product ads for campaigns or ad groups

## Prerequisites

1. **Amazon Ads Account**: You need an active Amazon Ads account
2. **API Credentials**: Register for Amazon Ads API access and obtain:
   - Client ID
   - Client Secret
   - Refresh Token

### Getting Amazon Ads API Credentials

#### Step 1: Register Your Application

1. Go to [Amazon Advertising API](https://advertising.amazon.com/API/docs/en-us/get-started/overview)
2. Sign in with your Amazon Ads account
3. Navigate to the Developer Center and create a new application
4. You'll receive a **Client ID** and **Client Secret** - save these!

#### Step 2: Get Your Refresh Token

We provide a helper script to obtain your refresh token through the OAuth flow:

1. Create a `.env` file in the project root:
   ```bash
   AMAZON_ADS_CLIENT_ID=your_client_id_here
   AMAZON_ADS_CLIENT_SECRET=your_client_secret_here
   ```

2. Run the OAuth helper script:
   ```bash
   npm run get-token
   ```

3. Your browser will open to Amazon's authorization page
4. Sign in and authorize the application
5. The script will display your **refresh token** - copy it to your `.env` file

#### Step 3: Note Your Region

Determine your advertising region:
- **NA**: North America (amazon.com)
- **EU**: Europe (amazon.co.uk, amazon.de, etc.)
- **FE**: Far East (amazon.co.jp, etc.)

## Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd amazonads-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file or set the following environment variables:

```bash
AMAZON_ADS_CLIENT_ID=your_client_id
AMAZON_ADS_CLIENT_SECRET=your_client_secret
AMAZON_ADS_REFRESH_TOKEN=your_refresh_token
AMAZON_ADS_REGION=NA  # Options: NA, EU, FE
AMAZON_ADS_SANDBOX=false  # Set to true for testing with sandbox API
```

### Claude Desktop Configuration

Add this server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "amazonads": {
      "command": "node",
      "args": ["/absolute/path/to/amazonads-mcp/build/index.js"],
      "env": {
        "AMAZON_ADS_CLIENT_ID": "your_client_id",
        "AMAZON_ADS_CLIENT_SECRET": "your_client_secret",
        "AMAZON_ADS_REFRESH_TOKEN": "your_refresh_token",
        "AMAZON_ADS_REGION": "NA"
      }
    }
  }
}
```

## Usage Examples

Once configured in Claude Desktop, you can ask Claude to:

- "Show me all my Amazon Ads campaigns"
- "What are the performance metrics for campaign ID 12345 from Jan 1 to Jan 31?"
- "List all keywords for campaign 12345"
- "Update the bid for keyword 67890 to $1.50"
- "Create a new Sponsored Products campaign with a $50 daily budget"
- "Show me all product ads in campaign 12345"

## Development

### Project Structure

```
amazonads-mcp/
├── src/
│   ├── index.ts              # Main MCP server implementation
│   └── amazon-ads-client.ts  # Amazon Ads API client
├── build/                     # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Development Mode

Watch for changes and rebuild automatically:

```bash
npm run watch
```

### Testing the Server

Run the server directly:

```bash
npm start
```

The server communicates over stdio and expects MCP protocol messages.

## API Coverage

This server currently supports:

- **Sponsored Products**: Full support for campaigns, keywords, and product ads
- **Sponsored Brands**: Campaign management (partial support)
- **Sponsored Display**: Campaign management (partial support)
- **Reporting**: Basic performance metrics (simplified implementation)

## Important Notes

1. **Rate Limiting**: The Amazon Ads API has rate limits. The client does not currently implement rate limiting logic.

2. **Reporting API**: The `get_campaign_performance` tool uses a simplified implementation. For production use, you should implement the full async reporting flow:
   - Create report request
   - Poll for report completion
   - Download and parse report

3. **Error Handling**: API errors are returned to the caller. Ensure proper credential configuration to avoid authentication errors.

4. **Regions**: Make sure to set the correct region (NA, EU, FE) based on your Amazon Ads account.

## Security

- Never commit your `.env` file or expose API credentials
- Refresh tokens should be stored securely
- Consider implementing credential rotation for production use

## Resources

- [Amazon Ads API Documentation](https://advertising.amazon.com/API/docs/en-us)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
