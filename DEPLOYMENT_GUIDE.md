# Holiday Moo Calendar - AWS Deployment Guide

## 🏗️ Architecture Overview

Your Holiday Moo Calendar is deployed using a modern AWS serverless architecture:

```
Users → Route53 (DNS) → CloudFront (CDN) → S3 (Static Files)
                                        ↘
                                         API Gateway → Lambda (Python Export Service)
```

### AWS Resources

#### Frontend (React App)

- **S3 Bucket**: `holiday-moo-534529346807-us-east-1`
- **CloudFront Distribution**: `EM1JCYFD2EBDK`
- **CloudFront URL**: `https://d43mtiy4ymqvd.cloudfront.net`

#### Backend (Export Service)

- **Lambda Function**: `holiday-moo-excel-export`
- **API Gateway**: `holiday-moo-api`
- **Runtime**: Python 3.9
- **Region**: `us-east-1`

## 🚀 Deployment Methods

### Method 1: Complete Deployment (Recommended)

Deploy both React app and Python service:

```bash
.\deploy-complete-aws.bat
```

Choose option 3 for both, or option 4 for first-time Lambda setup.

### Method 2: Individual Components

#### React App Only

```bash
.\deploy-to-aws.bat
```

#### Python Export Service Only

```bash
.\deploy-lambda.bat
```

#### First-Time Lambda Setup

```bash
.\setup-aws-lambda.bat
```

### Method 3: Manual Commands

#### React App

```bash
# 1. Build the app
npm run build

# 2. Upload to S3
aws s3 sync build/ s3://holiday-moo-534529346807-us-east-1 --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id EM1JCYFD2EBDK --paths "/*"
```

#### Lambda Service

```bash
# 1. Package Lambda function
pip install -r requirements-lambda.txt -t lambda-package/
# 2. Create ZIP and deploy (see setup-aws-lambda.bat for details)
```

## 📋 Pre-Deployment Checklist

### React App

- [ ] AWS CLI configured (`aws configure`)
- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] All code changes committed
- [ ] Environment variables configured in `.env`

### Python Export Service

- [ ] Python 3.7+ installed
- [ ] AWS CLI configured with Lambda permissions
- [ ] IAM role for Lambda execution exists
- [ ] API Gateway endpoint configured (first-time setup)
- [ ] Environment variables updated with API endpoint

## 🔧 What Gets Deployed

### Build Process

- React app optimized for production
- JavaScript and CSS minified and compressed
- Static assets optimized
- Service worker for caching

### File Structure in S3

```
s3://holiday-moo-534529346807-us-east-1/
├── index.html
├── asset-manifest.json
├── static/
│   ├── css/
│   │   ├── main.[hash].css
│   │   └── main.[hash].css.map
│   └── js/
│       ├── main.[hash].js
│       ├── main.[hash].js.map
│       └── main.[hash].js.LICENSE.txt
└── img/
    ├── logo.png
    ├── icon.png
    ├── banner.png
    ├── memo.png
    ├── bucket.png
    └── chatbot.png
```

## ⚡ Performance Features

### CloudFront CDN

- Global edge locations for fast loading
- Automatic HTTPS with SSL certificate
- Gzip compression enabled
- Browser caching optimized

### Caching Strategy

- Static assets (JS/CSS): Long-term caching (1 year)
- HTML files: Short-term caching (immediate updates)
- Images: Medium-term caching (1 month)

## 🧪 Post-Deployment Testing

After deployment, test these critical features:

### Core Functionality

- [ ] Calendar loads and displays correctly
- [ ] Events can be created, edited, and deleted
- [ ] Date navigation works properly

### AI Features

- [ ] Moo chatbot responds to queries
- [ ] Trip planning suggestions work
- [ ] AI-powered recommendations appear

### Maps Integration

- [ ] Google Maps loads in modals
- [ ] Location picker functions
- [ ] Map markers display correctly
- [ ] Places search works

### Export Features

- [ ] Trip export modal opens
- [ ] Excel export generates files
- [ ] PDF export works (if implemented)

### UI/UX

- [ ] All buttons and modals function
- [ ] Responsive design on mobile
- [ ] Loading states display properly
- [ ] Error handling works

## 🔍 Monitoring & Troubleshooting

### CloudWatch Metrics

Monitor these key metrics:

- CloudFront requests and errors
- S3 storage usage
- Cache hit ratio

### Common Issues

#### Cache Not Updating

**Problem**: Users see old version after deployment
**Solution**:

```bash
aws cloudfront create-invalidation --distribution-id EM1JCYFD2EBDK --paths "/*"
```

#### Build Failures

**Problem**: `npm run build` fails
**Solutions**:

- Check Node.js version compatibility
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for syntax errors in code

#### AWS Permission Errors

**Problem**: S3 upload or CloudFront invalidation fails
**Solutions**:

- Verify AWS CLI configuration: `aws sts get-caller-identity`
- Check IAM permissions for S3 and CloudFront
- Ensure correct region is set

## 💰 Cost Optimization

### Current Setup Costs (Estimated Monthly)

- **S3 Storage**: $0.50 - $2.00
- **CloudFront**: $1.00 - $5.00
- **Route53**: $0.50 (if using custom domain)
- **Data Transfer**: $0.50 - $1.00

**Total**: ~$2-8/month

### Cost Optimization Tips

- Enable CloudFront compression
- Use appropriate cache headers
- Monitor and optimize large assets
- Consider S3 Intelligent Tiering for backups

## 🔐 Security Best Practices

### Current Security Features

- ✅ HTTPS enforced via CloudFront
- ✅ S3 bucket not publicly accessible
- ✅ CloudFront Origin Access Control (OAC)
- ✅ API keys stored in environment variables

### Additional Security Recommendations

- Implement Content Security Policy (CSP)
- Add security headers via CloudFront
- Regular dependency updates
- Monitor for vulnerabilities

## 🔄 Rollback Procedure

If you need to rollback to a previous version:

1. **Identify Previous Build**

   ```bash
   aws s3 ls s3://holiday-moo-534529346807-us-east-1/ --recursive
   ```

2. **Restore from Backup** (if you have versioning enabled)

   ```bash
   aws s3 sync s3://backup-bucket/ s3://holiday-moo-534529346807-us-east-1/
   ```

3. **Invalidate Cache**
   ```bash
   aws cloudfront create-invalidation --distribution-id EM1JCYFD2EBDK --paths "/*"
   ```

## 📞 Support

### Useful Commands

```bash
# Check deployment status
aws s3 ls s3://holiday-moo-534529346807-us-east-1/

# Check CloudFront distribution
aws cloudfront get-distribution --id EM1JCYFD2EBDK

# List invalidations
aws cloudfront list-invalidations --distribution-id EM1JCYFD2EBDK

# Check AWS account
aws sts get-caller-identity
```

### Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)

---

**Last Updated**: September 15, 2025
**Deployment Version**: Production v1.0
**Next Review**: Monthly