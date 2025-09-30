# Holiday Moo - AI-Powered Travel Planning Calendar

Holiday Moo is an intelligent travel planning application that combines AI assistance with interactive calendar management and Google Maps integration to help users organize and plan their trips.

## 🌟 Features

- **AI Travel Assistant**: Dual AI system using xAI (Grok) for conversation and Perplexity AI for travel recommendations
- **Interactive Calendar**: React-based calendar interface for trip planning and event management
- **Google Maps Integration**: Location picker, place search, and interactive maps
- **Smart Itinerary Management**: Event organization, checklists, and trip details
- **Excel Export**: Export trip data to Excel files via AWS Lambda service
- **Responsive Design**: Mobile-first approach with desktop optimization

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Google Maps API key
- xAI (Grok) API key
- Perplexity AI API key
- AWS account (for Excel export feature)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd holiday-moo
```

2. Install dependencies:

```bash
npm install
```

3. Create environment configuration:

```bash
cp .env.example .env
```

4. Configure your API keys in `.env`:

```env
# Google Maps API
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# AI Services
REACT_APP_XAI_API_KEY=your_xai_grok_api_key
REACT_APP_PERPLEXITY_API_KEY=your_perplexity_api_key

# AWS Lambda (for Excel export)
REACT_APP_AWS_LAMBDA_EXPORT_URL=your_aws_lambda_endpoint

# Feature Flags
REACT_APP_ENABLE_AI_CHAT=true
REACT_APP_ENABLE_MAPS=true
REACT_APP_ENABLE_EXPORT=true
```

5. Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/         # React UI components
│   ├── Calendar.js     # Main calendar interface
│   ├── MooChatbot.js   # AI chat assistant
│   ├── TripModal.js    # Trip management
│   └── ...
├── config/             # App configuration
├── services/           # API integrations
│   ├── mooAgentService.js      # AI chat service
│   ├── tripPlannerService.js   # Trip planning logic
│   └── exportService.js       # Excel export
├── utils/              # Utility functions
├── styles/             # CSS styling
├── App.js              # Main application
└── index.js            # Entry point
```

## 🔧 Configuration

### Google Maps Setup

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Add your domain to API key restrictions

### AI Services Setup

**xAI (Grok):**

1. Sign up at [xAI](https://x.ai/)
2. Get your API key from the dashboard
3. Add to `.env` as `REACT_APP_XAI_API_KEY`

**Perplexity AI:**

1. Sign up at [Perplexity](https://www.perplexity.ai/)
2. Get your API key
3. Add to `.env` as `REACT_APP_PERPLEXITY_API_KEY`

### AWS Lambda Export (Optional)

For Excel export functionality, you'll need to deploy the AWS Lambda service:

1. Set up AWS CLI and credentials
2. Deploy the Lambda function (Python-based)
3. Add the endpoint URL to `.env`

## 📱 Usage

1. **Create a Trip**: Click "Add Trip" to start planning
2. **AI Assistant**: Use the chat feature for travel recommendations
3. **Add Events**: Click on calendar dates to add activities
4. **Location Search**: Use Google Places integration for locations
5. **Export Data**: Generate Excel files of your trip plans

## 🛠️ Available Scripts

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App
```

## 🔒 Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- The `.gitignore` file excludes all `.env*` files
- Backend services and deployment configs are not included in this repository

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions or issues:

1. Check the documentation in the `docs/` folder
2. Review the development journey in `HOLIDAY_MOO_DEVELOPMENT_JOURNEY.md`
3. Open an issue on GitHub

## 🏆 Acknowledgments

- Built with React and Create React App
- Powered by xAI (Grok) and Perplexity AI
- Maps by Google Maps Platform
- Export service via AWS Lambda

---

**Note**: This repository contains only the frontend source code. Backend services, API keys, and deployment configurations are maintained separately for security reasons.
