# Holiday Moo - Project Structure

## Core Application Files (Root Level)

- `.env`, `.env.example`, `.env.production` - Environment configuration
- `.gitignore` - Git ignore rules
- `package.json`, `package-lock.json` - Node.js dependencies
- `requirements.txt` - Python dependencies

## Source Code

- `src/` - React application source code
  - `components/` - React components
  - `config/` - Application configuration
  - `services/` - API services
  - `utils/` - Utility functions

## Documentation (`docs/`)

- `deployment/` - AWS deployment guides and setup instructions
- `project/` - Project planning and story documents
- `security/` - Security setup and configuration guides
- `domain/` - Domain and DNS configuration guides
- `api/` - API documentation and security setup
- `backend-proxy.html` - Backend proxy documentation

## Configuration (`config/`)

- `aws/` - AWS IAM policies and CloudFront configurations
- `lambda/` - Lambda functions and deployment packages
- `contact-info.json` - Contact information configuration

## Scripts (`scripts/`)

- `deployment/` - AWS deployment and Lambda setup scripts
- `testing/` - API testing and validation scripts
- `setup/` - Initial setup and configuration scripts

## Build & Deployment

- `build/` - Production build output
- `public/` - Static assets
- `lambda-package/` - Lambda deployment packages

## Development

- `.vscode/` - VS Code configuration
- `.kiro/` - Kiro IDE configuration
- `node_modules/` - Node.js dependencies

## Data & Assets

- `sample_data/` - Sample data for testing
- `img/` - Image assets
- `aws-config/` - AWS configuration files
