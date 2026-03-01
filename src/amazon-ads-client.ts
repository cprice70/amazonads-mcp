import https from "https";

interface AmazonAdsConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  region?: string;
  sandbox?: boolean;
}

export class AmazonAdsClient {
  private config: AmazonAdsConfig;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor() {
    // Load configuration from environment variables
    this.config = {
      clientId: process.env.AMAZON_ADS_CLIENT_ID,
      clientSecret: process.env.AMAZON_ADS_CLIENT_SECRET,
      refreshToken: process.env.AMAZON_ADS_REFRESH_TOKEN,
      region: process.env.AMAZON_ADS_REGION || "NA",
      sandbox: process.env.AMAZON_ADS_SANDBOX === "true",
    };
  }

  private getEndpoint(): string {
    const { region, sandbox } = this.config;

    if (sandbox) {
      return "https://advertising-api-test.amazon.com";
    }

    switch (region) {
      case "NA":
        return "https://advertising-api.amazon.com";
      case "EU":
        return "https://advertising-api-eu.amazon.com";
      case "FE":
        return "https://advertising-api-fe.amazon.com";
      default:
        return "https://advertising-api.amazon.com";
    }
  }

  private async ensureAccessToken(): Promise<void> {
    // Check if we have a valid access token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return;
    }

    // Refresh the access token
    const { clientId, clientSecret, refreshToken } = this.config;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        "Missing Amazon Ads credentials. Please set AMAZON_ADS_CLIENT_ID, AMAZON_ADS_CLIENT_SECRET, and AMAZON_ADS_REFRESH_TOKEN environment variables."
      );
    }

    const tokenData = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 1 minute before expiry
  }

  private async makeRequest(
    method: string,
    path: string,
    profileId?: string,
    body?: unknown,
    contentType?: string
  ): Promise<unknown> {
    await this.ensureAccessToken();

    const url = `${this.getEndpoint()}${path}`;
    const ct = contentType || "application/json";
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": ct,
      "Accept": ct,
      "Amazon-Advertising-API-ClientId": this.config.clientId!,
    };

    if (profileId) {
      headers["Amazon-Advertising-API-Scope"] = profileId;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Amazon Ads API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  async getProfiles(): Promise<unknown> {
    return this.makeRequest("GET", "/v2/profiles");
  }

  async getCampaigns(
    profileId: string,
    state?: string,
    campaignType?: string
  ): Promise<unknown> {
    // v3 API uses POST with filters in body
    let path = "/sp/campaigns/list";
    let contentType = "application/vnd.spcampaign.v3+json";

    if (campaignType === "sponsoredBrands") {
      path = "/sb/v4/campaigns/list";
      contentType = "application/vnd.sbcampaignresource.v4+json";
    } else if (campaignType === "sponsoredDisplay") {
      path = "/sd/campaigns/list";
      contentType = "application/vnd.sdcampaign.v3+json";
    }

    const body: Record<string, unknown> = {};

    if (state) {
      body.stateFilter = { include: [state.toUpperCase()] };
    }

    return this.makeRequest("POST", path, profileId, body, contentType);
  }

  async getCampaignPerformance(
    profileId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown> {
    // v3 reporting API
    const contentType = "application/vnd.createasyncreportrequest.v3+json";

    const reportBody = {
      name: `Campaign ${campaignId} Performance Report`,
      startDate,
      endDate,
      configuration: {
        adProduct: "SPONSORED_PRODUCTS",
        groupBy: ["campaign"],
        columns: [
          "campaignId",
          "campaignName",
          "impressions",
          "clicks",
          "cost",
          "spend",
          "sales14d",
          "purchases14d",
          "unitsSoldClicks14d",
          "clickThroughRate",
          "costPerClick",
        ],
        reportTypeId: "spCampaigns",
        timeUnit: "SUMMARY",
        format: "GZIP_JSON",
      },
    };

    // Note: This creates an async report. Production implementation should:
    // 1. POST to /reporting/reports to create report (returns reportId)
    // 2. Poll GET /reporting/reports/{reportId} until status is COMPLETED
    // 3. Download report from the URL in the response
    // The campaignId filter is not available when grouping by campaign,
    // so the report will include all campaigns. Filter client-side if needed.

    return this.makeRequest("POST", "/reporting/reports", profileId, reportBody, contentType);
  }

  async getKeywords(
    profileId: string,
    campaignId?: string,
    adGroupId?: string
  ): Promise<unknown> {
    const path = "/sp/keywords/list";
    const contentType = "application/vnd.spkeyword.v3+json";

    const body: Record<string, unknown> = {};

    if (campaignId) {
      body.campaignIdFilter = { include: [campaignId] };
    }

    if (adGroupId) {
      body.adGroupIdFilter = { include: [adGroupId] };
    }

    return this.makeRequest("POST", path, profileId, body, contentType);
  }

  async updateKeywordBid(
    profileId: string,
    keywordId: string,
    bid: number
  ): Promise<unknown> {
    const contentType = "application/vnd.spkeyword.v3+json";
    const body = {
      keywords: [
        {
          keywordId,
          bid,
        },
      ],
    };

    return this.makeRequest("PUT", "/sp/keywords", profileId, body, contentType);
  }

  async createCampaign(
    profileId: string,
    name: string,
    campaignType: string,
    targetingType: string,
    dailyBudget: number,
    startDate: string
  ): Promise<unknown> {
    let path = "/sp/campaigns";
    let contentType = "application/vnd.spcampaign.v3+json";

    if (campaignType === "sponsoredBrands") {
      path = "/sb/v4/campaigns";
      contentType = "application/vnd.sbcampaignresource.v4+json";
    } else if (campaignType === "sponsoredDisplay") {
      path = "/sd/campaigns";
      contentType = "application/vnd.sdcampaign.v3+json";
    }

    const body = {
      campaigns: [
        {
          name,
          targetingType,
          state: "ENABLED",
          budget: {
            budgetType: "DAILY",
            budget: dailyBudget,
          },
          startDate,
        },
      ],
    };

    return this.makeRequest("POST", path, profileId, body, contentType);
  }

  async getProductAds(
    profileId: string,
    campaignId?: string,
    adGroupId?: string
  ): Promise<unknown> {
    const path = "/sp/productAds/list";
    const contentType = "application/vnd.spproductad.v3+json";

    const body: Record<string, unknown> = {};

    if (campaignId) {
      body.campaignIdFilter = { include: [campaignId] };
    }

    if (adGroupId) {
      body.adGroupIdFilter = { include: [adGroupId] };
    }

    return this.makeRequest("POST", path, profileId, body, contentType);
  }
}
