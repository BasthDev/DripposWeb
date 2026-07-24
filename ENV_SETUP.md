# Web App Environment Variables Setup

Add these environment variables to your web app's `.env.local` file:

```bash
# Paddle Configuration
PADDLE_SANDBOX_API_KEY=your_sandbox_api_key_here
PADDLE_LIVE_API_KEY=your_live_api_key_here
PADDLE_ENVIRONMENT=sandbox
```

## Instructions

1. Copy the values above to your `web/.env.local` file
2. Replace `your_sandbox_api_key_here` with your actual Paddle sandbox API key
3. Set `PADDLE_ENVIRONMENT=sandbox` for testing, `production` for live
4. Add your live API key when going to production

## Current Configuration

- **Environment**: sandbox
- **Basic Plan Price**: pri_01ky9gf1b3x9pxh1d0w58svqma ($3.50/month)
- **Pro Plan Price**: pri_01ky9gf1pfhfxefmqen09hq334 ($10.50/month)

## API Keys Location

Your Paddle API keys are in the mobile app `.env` file at `d:\POSProject\.env`
