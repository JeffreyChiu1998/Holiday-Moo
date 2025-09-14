# 🚀 AWS Deployment Checklist for Holiday Moo Calendar

## ✅ Pre-Deployment Checklist

### 1. AWS Prerequisites

- [ ] AWS Account created and billing enabled
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] Node.js and npm installed (`node --version`, `npm --version`)

### 2. Project Preparation

- [x] React app builds successfully (`npm run build`)
- [x] Environment variables configured in `.env`
- [x] `.gitignore` includes `.env` file
- [x] CloudFormation template ready
- [x] Deployment script ready
- [x] Backend Lambda function ready (optional)

### 3. API Keys Ready

- [ ] XAI API Key obtained
- [ ] Perplexity API Key obtained
- [ ] Google Maps API Key obtained and configured

## 🚀 Deployment Steps

### Step 1: Verify AWS Configuration

```bash
# Test AWS CLI access
aws sts get-caller-identity

# Should return your account info
```

### Step 2: Build and Test Locally

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Verify build folder exists
ls -la build/
```

### Step 3: Deploy to AWS

```bash
# Make deployment script executable (Linux/Mac)
chmod +x aws-config/deploy.sh

# Run deployment
./aws-config/deploy.sh
```

### Step 4: Update API Keys in AWS

After deployment, update your API keys in AWS Parameter Store:

```bash
# Update XAI API Key
aws ssm put-parameter \
    --name "/holiday-moo/api-keys/xai" \
    --value "your-actual-xai-key" \
    --type "SecureString" \
    --overwrite

# Update Perplexity API Key
aws ssm put-parameter \
    --name "/holiday-moo/api-keys/perplexity" \
    --value "your-actual-perplexity-key" \
    --type "SecureString" \
    --overwrite

# Update Google Maps API Key
aws ssm put-parameter \
    --name "/holiday-moo/api-keys/google-maps" \
    --value "your-actual-google-maps-key" \
    --type "SecureString" \
    --overwrite
```

### Step 5: Test Deployment

- [ ] Visit the CloudFront URL provided after deployment
- [ ] Test calendar functionality
- [ ] Test AI chatbot features
- [ ] Test Google Maps integration
- [ ] Test trip export functionality

## 🔐 Security Configuration

### Google Maps API Restrictions

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your Google Maps API key
3. Add HTTP referrers restriction:
   - `https://your-cloudfront-domain.cloudfront.net/*`
   - `https://your-custom-domain.com/*` (if using custom domain)

### API Usage Monitoring

- Set up billing alerts in Google Cloud Console
- Monitor XAI and Perplexity usage in their dashboards
- Set up AWS CloudWatch alarms for unusual activity

## 💰 Cost Optimization

### AWS Resources

- S3 bucket with lifecycle policies
- CloudFront with appropriate caching
- Parameter Store for secure key storage
- (Optional) Lambda for backend API proxy

### Expected Monthly Costs

- **S3**: $0.50 - $2.00
- **CloudFront**: $1.00 - $5.00
- **Parameter Store**: $0.05
- **Lambda** (if used): $0.20 - $1.00
- **Total**: ~$2-8/month

## 🔧 Advanced Configuration (Optional)

### Custom Domain Setup

1. Register domain in Route 53
2. Request SSL certificate in ACM
3. Update CloudFormation template
4. Configure DNS records

### Backend API (Enhanced Security)

If you want to hide API keys completely:

1. Deploy the Lambda backend function
2. Update frontend to call Lambda endpoints
3. Remove API keys from frontend environment

## 🆘 Troubleshooting

### Common Issues

1. **Build fails**: Check Node.js version compatibility
2. **AWS CLI not configured**: Run `aws configure`
3. **S3 upload fails**: Check AWS permissions
4. **CloudFront not updating**: Wait 5-15 minutes for cache invalidation
5. **API keys not working**: Verify Parameter Store values

### Debug Commands

```bash
# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name holiday-moo-calendar

# Check S3 bucket
aws s3 ls s3://holiday-moo-[account-id]-[region] --recursive

# Check Parameter Store
aws ssm get-parameters --names "/holiday-moo/api-keys/xai" "/holiday-moo/api-keys/perplexity" "/holiday-moo/api-keys/google-maps" --with-decryption
```

## 🎉 Post-Deployment

### Success Indicators

- ✅ Website loads at CloudFront URL
- ✅ Calendar displays correctly
- ✅ AI chatbot responds to queries
- ✅ Google Maps shows locations
- ✅ Trip export works
- ✅ No console errors

### Next Steps

1. Set up monitoring and alerts
2. Configure custom domain (optional)
3. Set up CI/CD pipeline (optional)
4. Monitor costs and usage
5. Plan for scaling if needed

Your Holiday Moo Calendar is ready for the world! 🌍✈️