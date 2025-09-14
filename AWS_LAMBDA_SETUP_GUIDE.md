# AWS Lambda Setup Guide for Holiday Moo Calendar

Since you don't have IAM permissions via CLI, let's set this up through the AWS Console.

## Step 1: Create Lambda Function in AWS Console

1. **Go to AWS Lambda Console**

   - Open https://console.aws.amazon.com/lambda/
   - Make sure you're in the `us-east-1` region

2. **Create Function**
   - Click "Create function"
   - Choose "Author from scratch"
   - Function name: `holiday-moo-excel-export`
   - Runtime: `Python 3.9`
   - Architecture: `x86_64`
   - Click "Create function"

## Step 2: Upload Code

1. **Prepare the code package**
   - Run this command in your project directory:

```bash
.\prepare-lambda-package.bat
```

2. **Upload to Lambda**
   - In the Lambda console, go to your function
   - In the "Code" tab, click "Upload from" → ".zip file"
   - Upload the `lambda-deployment.zip` file
   - Click "Save"

## Step 3: Configure Function

1. **Set timeout**

   - Go to "Configuration" → "General configuration"
   - Click "Edit"
   - Set timeout to 30 seconds
   - Set memory to 512 MB
   - Click "Save"

2. **Test the function**
   - Go to "Test" tab
   - Create new test event with this JSON:

```json
{
  "httpMethod": "OPTIONS"
}
```

- Click "Test"
- Should return success response

## Step 4: Create API Gateway

1. **Go to API Gateway Console**

   - Open https://console.aws.amazon.com/apigateway/
   - Click "Create API"
   - Choose "REST API" (not private)
   - Click "Build"

2. **Configure API**

   - API name: `holiday-moo-api`
   - Description: `Excel export API for Holiday Moo Calendar`
   - Click "Create API"

3. **Create Resource**

   - Click "Actions" → "Create Resource"
   - Resource Name: `export`
   - Resource Path: `/export`
   - **IMPORTANT**: DO NOT check "Configure as proxy resource"
   - Enable CORS: ✅
   - Click "Create Resource"

4. **Create POST Method**

   - Select the `/export` resource
   - Click "Actions" → "Create Method"
   - Choose "POST" from dropdown
   - Click the checkmark
   - Integration type: "Lambda Function"
   - Use Lambda Proxy integration: ✅
   - Lambda Region: `us-east-1`
   - Lambda Function: `holiday-moo-excel-export`
   - Click "Save"
   - Click "OK" to give API Gateway permission

5. **Enable CORS**

   - Select the `/export` resource
   - Click "Actions" → "Enable CORS"
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - Access-Control-Allow-Methods: `GET,POST,OPTIONS`
   - Click "Enable CORS and replace existing CORS headers"

6. **Deploy API**
   - Click "Actions" → "Deploy API"
   - Deployment stage: "New Stage"
   - Stage name: `prod`
   - Click "Deploy"

## Step 5: Get Your API Endpoint

After deployment, you'll see your API endpoint URL like:

```
https://abcd1234.execute-api.us-east-1.amazonaws.com/prod
```

Your export endpoint will be:

```
https://abcd1234.execute-api.us-east-1.amazonaws.com/prod/export
```

## Step 6: Update Your React App

1. **Create .env file**
   - Copy `.env.example` to `.env`
   - Update with your actual API endpoint:

```env
REACT_APP_EXPORT_API_URL=https://your-actual-api-id.execute-api.us-east-1.amazonaws.com/prod/export
REACT_APP_EXPORT_SERVICE_ENABLED=true
```

2. **Deploy updated React app**

```bash
.\deploy-to-aws.bat
```

## Step 7: Test

1. Open your app: https://d43mtiy4ymqvd.cloudfront.net
2. Create a trip with some events
3. Try the Excel export feature
4. Check browser console for any errors

## Troubleshooting

- **CORS errors**: Make sure CORS is properly enabled in API Gateway
- **Timeout errors**: Increase Lambda timeout in function configuration
- **Permission errors**: Check Lambda execution role has basic execution permissions
- **Import errors**: Make sure all Python dependencies are included in the ZIP

## Cost Estimate

- **Lambda**: ~$0.20 per 1M requests + compute time
- **API Gateway**: ~$3.50 per 1M requests
- **Total**: Very low cost for typical usage (under $1/month)