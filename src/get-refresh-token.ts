#!/usr/bin/env node

/**
 * Helper script to obtain Amazon Ads API refresh token through OAuth 2.0 flow
 *
 * Usage:
 *   1. Set your AMAZON_ADS_CLIENT_ID and AMAZON_ADS_CLIENT_SECRET in .env
 *   2. Run: npm run get-token
 *   3. Follow the prompts to authorize the application
 */

import http from "http";
import { URL } from "url";

// Load environment variables if .env file exists
try {
  const dotenv = await import("dotenv");
  dotenv.config();
} catch (e) {
  // dotenv not installed, skip
}

const CLIENT_ID = process.env.AMAZON_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_ADS_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/callback";

// Scopes needed for Amazon Ads API
const SCOPES = "advertising::campaign_management";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\n❌ Error: Missing credentials!");
  console.error("\nPlease set the following environment variables:");
  console.error("  AMAZON_ADS_CLIENT_ID");
  console.error("  AMAZON_ADS_CLIENT_SECRET");
  console.error("\nYou can set them in a .env file or export them in your shell.\n");
  process.exit(1);
}

console.log("\n🚀 Amazon Ads OAuth 2.0 Token Generator");
console.log("=====================================\n");

// Create authorization URL
const authUrl = new URL("https://www.amazon.com/ap/oa");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);

console.log("Step 1: Authorize the application");
console.log("----------------------------------");
console.log("\nStarting local callback server on http://localhost:3000...");

// Create a simple HTTP server to receive the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
            <h1>❌ Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      console.error(`\n❌ Authorization failed: ${error}\n`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
            <h1>❌ Missing Authorization Code</h1>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      console.error("\n❌ No authorization code received\n");
      server.close();
      process.exit(1);
    }

    console.log("\n✓ Authorization code received!");
    console.log("\nStep 2: Exchanging code for refresh token");
    console.log("------------------------------------------\n");

    try {
      // Exchange authorization code for tokens
      const tokenData = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      });

      const response = await fetch("https://api.amazon.com/auth/o2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens = await response.json();

      // Success page
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
            <h1>✅ Success!</h1>
            <p>Your refresh token has been generated.</p>
            <p>Check your console for the token.</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);

      console.log("✅ Successfully obtained tokens!\n");
      console.log("=".repeat(80));
      console.log("\nAdd these to your .env file:\n");
      console.log(`AMAZON_ADS_CLIENT_ID=${CLIENT_ID}`);
      console.log(`AMAZON_ADS_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`AMAZON_ADS_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`\n${"=".repeat(80)}\n`);
      console.log("ℹ️  Additional information:");
      console.log(`   Access Token: ${tokens.access_token.substring(0, 20)}...`);
      console.log(`   Expires In: ${tokens.expires_in} seconds`);
      console.log(`   Token Type: ${tokens.token_type}\n`);

      server.close();
      process.exit(0);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
            <h1>❌ Token Exchange Failed</h1>
            <p>${error instanceof Error ? error.message : String(error)}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
      console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log("✓ Callback server started\n");
  console.log("Please open the following URL in your browser to authorize:\n");
  console.log(`  ${authUrl.toString()}\n`);
  console.log("If the browser doesn't open automatically, copy and paste the URL above.\n");
  console.log("Waiting for authorization...\n");

  // Try to open the browser automatically
  const openBrowser = async () => {
    try {
      const open = await import("open");
      await open.default(authUrl.toString());
    } catch (e) {
      // 'open' package not installed, user will need to copy/paste URL
    }
  };
  openBrowser();
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Process interrupted. Shutting down...\n");
  server.close();
  process.exit(0);
});
