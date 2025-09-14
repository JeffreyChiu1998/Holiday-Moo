# Environment Setup Guide

This guide helps you set up the environment variables needed for Holiday Moo Calendar.

## Quick Setup

1. **Copy the example file**:

   ```bash
   cp .env.example .env
   ```

2. **Get your API keys** (see sections below)

3. **Update the `.env` file** with your actual keys

4. **Deploy your app**

## Required API Keys

### 1. xAI (Grok) API Key

- **Purpose**: Powers Moo's conversation AI
- **Get it from**: https://console.x.ai/
- **Cost**: Pay-per-use, very affordable for personal projects
- **Required for**: Chatbot functionality

### 2. Perplexity AI API Key

- **Purpose**: Powers travel recommendations
- **Get it from**: https://www.perplexity.ai/settings/api
- **Cost**: Free tier available, then pay-per-use
- **Required for**: Travel advice feature

### 3. Google Maps API Key

- **Purpose**: Location services and maps
- **Get it from**: https://console.cloud.google.com/apis/credentials
- **Required APIs**:
  - Maps JavaScript API
  - Places API
  - Geocoding API
- **Cost**: Free tier with generous limits
- **Required for**: Location picker, maps in modals

## Optional: AWS Lambda Export Service

If you want Excel export functionality:

1. **Run the setup script**:

   ```bash
   ./setup-aws-lambda.bat
   ```

2. **Get your API Gateway URL** from the AWS Console

3. **Update your `.env` file**:
   ```env
   REACT_APP_EXPORT_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/export
   REACT_APP_EXPORT_SERVICE_ENABLED=true
   ```

## Security Best Practices

- ✅ Never commit `.env` files to version control
- ✅ Use different API keys for development/production
- ✅ Set up usage limits and billing alerts
- ✅ Regularly rotate your API keys
- ✅ Restrict API keys to your domain in production

## Deployment

### For Static Hosting (Netlify, Vercel, etc.)

Set environment variables in your hosting platform's dashboard.

### For AWS S3 + CloudFront

Environment variables are built into the static files during `npm run build`.

## Troubleshooting

### "API key not found" errors

- Check that your `.env` file exists in the project root
- Verify all required variables are set
- Restart your development server after changing `.env`

### Maps not loading

- Verify your Google Maps API key is correct
- Check that required APIs are enabled in Google Cloud Console
- Ensure your API key isn't restricted to other domains

### Chatbot not responding

- Verify both xAI and Perplexity API keys are set
- Check browser console for API errors
- Ensure you have sufficient API credits

### Export feature not working

- Check that `REACT_APP_EXPORT_SERVICE_ENABLED=true`
- Verify your AWS Lambda service is deployed
- Test the API Gateway endpoint directly

## Cost Estimates (Monthly)

- **xAI API**: $1-5 for typical usage
- **Perplexity API**: Free tier covers most personal use
- **Google Maps API**: Free tier covers most personal use
- **AWS Lambda**: $0.20-1.00 for typical usage

**Total**: Usually under $10/month for personal use

## Need Help?

- Check the main README.md for detailed setup instructions
- Review AWS_LAMBDA_SETUP_GUIDE.md for export service setup
- Open an issue if you encounter problems