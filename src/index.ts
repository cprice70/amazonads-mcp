#!/usr/bin/env node

import "dotenv/config";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { AmazonAdsClient } from "./amazon-ads-client.js";

const server = new Server(
  {
    name: "amazonads-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Amazon Ads client
const amazonAdsClient = new AmazonAdsClient();

// Define available tools
const tools: Tool[] = [
  {
    name: "get_campaigns",
    description: "Retrieve a list of advertising campaigns from Amazon Ads. Optionally filter by campaign state (enabled, paused, archived) and campaign type (sponsoredProducts, sponsoredBrands, sponsoredDisplay).",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "The Amazon Ads profile ID to query campaigns for",
        },
        state: {
          type: "string",
          enum: ["enabled", "paused", "archived"],
          description: "Optional: Filter campaigns by state",
        },
        campaignType: {
          type: "string",
          enum: ["sponsoredProducts", "sponsoredBrands", "sponsoredDisplay"],
          description: "Optional: Filter by campaign type",
        },
      },
      required: ["profileId"],
    },
  },
  {
    name: "get_campaign_performance",
    description: "Get performance metrics for a specific campaign including impressions, clicks, cost, sales, and conversions.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "The Amazon Ads profile ID",
        },
        campaignId: {
          type: "string",
          description: "The campaign ID to get performance data for",
        },
        startDate: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        endDate: {
          type: "string",
          description: "End date in YYYY-MM-DD format",
        },
      },
      required: ["profileId", "campaignId", "startDate", "endDate"],
    },
  },
  {
    name: "get_keywords",
    description: "Retrieve keywords for a specific campaign or ad group, including bid amounts and match types.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "The Amazon Ads profile ID",
        },
        campaignId: {
          type: "string",
          description: "Optional: Filter keywords by campaign ID",
        },
        adGroupId: {
          type: "string",
          description: "Optional: Filter keywords by ad group ID",
        },
      },
      required: ["profileId"],
    },
  },
  {
    name: "update_keyword_bid",
    description: "Update the bid amount for a specific keyword.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "The Amazon Ads profile ID",
        },
        keywordId: {
          type: "string",
          description: "The keyword ID to update",
        },
        bid: {
          type: "number",
          description: "The new bid amount",
        },
      },
      required: ["profileId", "keywordId", "bid"],
    },
  },
  {
    name: "get_profiles",
    description: "List all available Amazon Ads profiles (accounts) that the authenticated user has access to.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_campaign",
    description: "Create a new advertising campaign in Amazon Ads.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "The Amazon Ads profile ID",
        },
        name: {
          type: "string",
          description: "Campaign name",
        },
        campaignType: {
          type: "string",
          enum: ["sponsoredProducts", "sponsoredBrands", "sponsoredDisplay"],
          description: "Type of campaign to create",
        },
        targetingType: {
          type: "string",
          enum: ["manual", "auto"],
          description: "Targeting type for the campaign",
        },
        dailyBudget: {
          type: "number",
          description: "Daily budget amount",
        },
        startDate: {
          type: "string",
          description: "Campaign start date in YYYY-MM-DD format",
        },
      },
      required: ["profileId", "name", "campaignType", "targetingType", "dailyBudget", "startDate"],
    },
  },
  {
    name: "get_product_ads",
    description: "Retrieve product ads for a specific campaign or ad group.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "The Amazon Ads profile ID",
        },
        campaignId: {
          type: "string",
          description: "Optional: Filter by campaign ID",
        },
        adGroupId: {
          type: "string",
          description: "Optional: Filter by ad group ID",
        },
      },
      required: ["profileId"],
    },
  },
  {
    name: "archive_campaign",
    description: "Archive a campaign. Archived campaigns cannot spend money and are hidden from default views. This is the only way to 'delete' a campaign in Amazon Ads.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "The Amazon Ads profile ID",
        },
        campaignId: {
          type: "string",
          description: "The campaign ID to archive",
        },
        campaignType: {
          type: "string",
          enum: ["sponsoredProducts", "sponsoredBrands", "sponsoredDisplay"],
          description: "Type of campaign",
        },
      },
      required: ["profileId", "campaignId", "campaignType"],
    },
  },
];

// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("Missing arguments");
  }

  try {
    switch (name) {
      case "get_campaigns": {
        const campaigns = await amazonAdsClient.getCampaigns(
          args.profileId as string,
          args.state as string | undefined,
          args.campaignType as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(campaigns, null, 2),
            },
          ],
        };
      }

      case "get_campaign_performance": {
        const performance = await amazonAdsClient.getCampaignPerformance(
          args.profileId as string,
          args.campaignId as string,
          args.startDate as string,
          args.endDate as string
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(performance, null, 2),
            },
          ],
        };
      }

      case "get_keywords": {
        const keywords = await amazonAdsClient.getKeywords(
          args.profileId as string,
          args.campaignId as string | undefined,
          args.adGroupId as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(keywords, null, 2),
            },
          ],
        };
      }

      case "update_keyword_bid": {
        const result = await amazonAdsClient.updateKeywordBid(
          args.profileId as string,
          args.keywordId as string,
          args.bid as number
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_profiles": {
        const profiles = await amazonAdsClient.getProfiles();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(profiles, null, 2),
            },
          ],
        };
      }

      case "create_campaign": {
        const campaign = await amazonAdsClient.createCampaign(
          args.profileId as string,
          args.name as string,
          args.campaignType as string,
          args.targetingType as string,
          args.dailyBudget as number,
          args.startDate as string
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(campaign, null, 2),
            },
          ],
        };
      }

      case "get_product_ads": {
        const productAds = await amazonAdsClient.getProductAds(
          args.profileId as string,
          args.campaignId as string | undefined,
          args.adGroupId as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(productAds, null, 2),
            },
          ],
        };
      }

      case "archive_campaign": {
        const result = await amazonAdsClient.archiveCampaign(
          args.profileId as string,
          args.campaignId as string,
          args.campaignType as string
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Amazon Ads MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
