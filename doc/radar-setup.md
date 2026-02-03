# Radar Address Autocomplete Setup

This document explains how to configure Radar for address autocomplete in the client intake form.

## What is Radar?

[Radar](https://radar.com/) is a location data platform that provides address autocomplete, geocoding, and geofencing APIs. We use their autocomplete API to provide address suggestions as users type.

## Why Radar?

- **Generous free tier**: 100,000 requests/month (effectively unlimited for law firm use)
- **Good autocomplete UX**: ~95% as good as Google Places
- **USPS-standardized addresses**: Returns properly formatted US address components
- **Simple setup**: No billing required to start
- **US-focused**: Optimized for domestic addresses

## Getting an API Key

1. Create a free account at [radar.com](https://radar.com/)
2. Navigate to the **API Keys** section in the dashboard
3. Copy your **Publishable API Key** (starts with `prj_live_pk_...`)
   - Use the **Test** key for development (`prj_test_pk_...`)
   - Use the **Live** key for production (`prj_live_pk_...`)

## Configuration

### Local Development

Add the API key to your `.env` file:

```env
RADAR_API_KEY=prj_test_pk_your_key_here
```

### Production (Cloudflare Workers)

Add the secret using wrangler:

```bash
# For production
wrangler secret put RADAR_API_KEY

# For preview/staging
wrangler secret put RADAR_API_KEY --env preview
```

Or via the Cloudflare Dashboard:
1. Go to Workers & Pages > your worker > Settings > Variables
2. Add `RADAR_API_KEY` as an encrypted secret

## Verifying Configuration

1. Start the development server: `pnpm dev`
2. Navigate to `/clients/new`
3. In the Address section, start typing an address
4. You should see autocomplete suggestions appear

If no suggestions appear:
- Check the browser console for errors
- Verify the API key is set correctly
- Check the server logs for Radar API errors

## API Usage

The address autocomplete endpoint is at:

```
GET /api/address/autocomplete?q={query}&limit={limit}
```

Parameters:
- `q` (required): Search query (minimum 3 characters)
- `limit` (optional): Number of results (1-10, default 5)

Response:
```json
{
  "suggestions": [
    {
      "formattedAddress": "123 Main St, San Francisco, CA 94102",
      "addressLabel": "123 Main St",
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94102",
      "county": "San Francisco",
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  ]
}
```

## Cost Projections

| Monthly Requests | Cost |
|-----------------|------|
| 0-100,000 | Free |
| 100,000+ | $0.50/1,000 requests |

For a typical law firm with 50 clients/month, expect ~500 autocomplete requests (10 keystrokes per address lookup), well within the free tier.

## Troubleshooting

### "Address autocomplete service not configured"

The `RADAR_API_KEY` environment variable is not set. See the Configuration section above.

### No suggestions returned

1. Check that the query is at least 3 characters
2. Verify the API key is valid at [radar.com/dashboard](https://radar.com/dashboard)
3. Check server logs for error messages

### Suggestions are slow

Radar typically responds in 100-200ms. If slower:
- Check your network connection
- Consider increasing the debounce delay in the component
