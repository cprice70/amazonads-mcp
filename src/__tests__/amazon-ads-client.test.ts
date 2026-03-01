import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment variables before importing the client
vi.stubEnv("AMAZON_ADS_CLIENT_ID", "test-client-id");
vi.stubEnv("AMAZON_ADS_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("AMAZON_ADS_REFRESH_TOKEN", "test-refresh-token");
vi.stubEnv("AMAZON_ADS_REGION", "NA");
vi.stubEnv("AMAZON_ADS_SANDBOX", "false");

import { AmazonAdsClient } from "../amazon-ads-client.js";

describe("AmazonAdsClient", () => {
  let client: AmazonAdsClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new AmazonAdsClient();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getEndpoint", () => {
    it("returns NA endpoint by default", () => {
      // Access private method via any cast for testing
      const endpoint = (client as any).getEndpoint();
      expect(endpoint).toBe("https://advertising-api.amazon.com");
    });
  });

  describe("getProfiles", () => {
    it("fetches profiles after token refresh", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Mock profiles response
      const mockProfiles = [
        { profileId: "123", countryCode: "US", accountInfo: { name: "Test" } },
      ];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfiles),
      });

      const profiles = await client.getProfiles();

      expect(profiles).toEqual(mockProfiles);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Verify token refresh call
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.amazon.com/auth/o2/token"
      );

      // Verify profiles call
      expect(fetchMock.mock.calls[1][0]).toBe(
        "https://advertising-api.amazon.com/v2/profiles"
      );
    });
  });

  describe("getCampaigns", () => {
    it("uses v3 API with correct content type", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Mock campaigns response
      const mockCampaigns = { campaigns: [{ campaignId: "456", name: "Test" }] };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockCampaigns),
      });

      const campaigns = await client.getCampaigns("profile-123");

      expect(campaigns).toEqual(mockCampaigns);

      // Verify v3 endpoint
      expect(fetchMock.mock.calls[1][0]).toBe(
        "https://advertising-api.amazon.com/sp/campaigns/list"
      );

      // Verify content type header
      const headers = fetchMock.mock.calls[1][1].headers;
      expect(headers["Content-Type"]).toBe(
        "application/vnd.spcampaign.v3+json"
      );
    });

    it("filters by state when provided", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Mock response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ campaigns: [] }),
      });

      await client.getCampaigns("profile-123", "enabled");

      // Verify request body includes state filter
      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body.stateFilter).toEqual({ include: ["ENABLED"] });
    });
  });

  describe("retry logic", () => {
    it("retries on 429 rate limit", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // First call: rate limited
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
        text: async () => "Rate limited",
      });

      // Second call: success
      const mockProfiles = [{ profileId: "123" }];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfiles),
      });

      const profiles = await client.getProfiles();

      expect(profiles).toEqual(mockProfiles);
      expect(fetchMock).toHaveBeenCalledTimes(3); // token + retry + success
    });

    it("retries on 503 server error", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // First call: server error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
        text: async () => "Service unavailable",
      });

      // Second call: success
      const mockProfiles = [{ profileId: "123" }];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockProfiles),
      });

      const profiles = await client.getProfiles();

      expect(profiles).toEqual(mockProfiles);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("does not retry on 400 client error", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Client error - should not retry
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers(),
        text: async () => "Bad request",
      });

      await expect(client.getProfiles()).rejects.toThrow(
        "Amazon Ads API error (400)"
      );
      expect(fetchMock).toHaveBeenCalledTimes(2); // token + one attempt only
    });
  });

  describe("archiveCampaign", () => {
    it("uses delete endpoint", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Mock delete response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      });

      await client.archiveCampaign("profile-123", "campaign-456", "sponsoredProducts");

      // Verify delete endpoint
      expect(fetchMock.mock.calls[1][0]).toBe(
        "https://advertising-api.amazon.com/sp/campaigns/delete"
      );

      // Verify POST method
      expect(fetchMock.mock.calls[1][1].method).toBe("POST");

      // Verify body contains campaignIdFilter
      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body.campaignIdFilter).toEqual({ include: ["campaign-456"] });
    });
  });

  describe("token caching", () => {
    it("reuses valid token", async () => {
      // Mock token refresh
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Mock two profile calls
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([{ profileId: "123" }]),
      });

      await client.getProfiles();
      await client.getProfiles();

      // Token should only be fetched once
      expect(
        fetchMock.mock.calls.filter(
          (call: any[]) => call[0] === "https://api.amazon.com/auth/o2/token"
        )
      ).toHaveLength(1);
    });
  });
});
