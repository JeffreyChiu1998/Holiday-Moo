# 🐄 Holiday Moo - AI-Powered Travel Planning Calendar

A React-based travel planning application with AI-powered recommendations, interactive maps, and smart itinerary management.

## ✨ Features

- **AI Travel Assistant**: Get personalized travel recommendations using xAI (Grok) and Perplexity AI
- **Interactive Calendar**: Plan your trips with a beautiful, intuitive calendar interface
- **Google Maps Integration**: Location picker, interactive maps, and place search
- **Smart Itinerary Management**: Organize events, create checklists, and manage trip details
- **Excel Export**: Export your trip data to Excel files (requires AWS Lambda setup)
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 14 or higher)
- **npm** or **yarn**
- **API Keys** (see setup instructions below)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/holiday-moo.git
cd holiday-moo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:

#### Required API Keys:

**xAI (Grok) API Key**

- Visit: https://console.x.ai/
- Create an account and generate an API key
- Add to `.env`: `REACT_APP_XAI_API_KEY=your-xai-api-key-here`

**Perplexity AI API Key**

- Visit: https://www.perplexity.ai/settings/api
- Create an account and generate an API key
- Add to `.env`: `REACT_APP_PERPLEXITY_API_KEY=your-perplexity-api-key-here`

**Google Maps API Key**

- Visit: https://console.cloud.google.com/apis/credentials
- Enable these APIs: Maps JavaScript API, Places API, Geocoding API
- Create credentials and get your API key
- Add to `.env`: `REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here`

#### Optional (for Excel Export):

**AWS Lambda Export Service**

- Set `REACT_APP_EXPORT_SERVICE_ENABLED=false` if you don't need Excel export
- Or follow AWS setup guide in `docs/deployment/` to enable this feature

### 4. Run the Application

```bash
npm start
```

The app will open at `http://localhost:3000`

## 📱 How to Use

### Getting Started

1. **Create a Trip**: Click "New Trip" to start planning
2. **Add Events**: Use the calendar to add activities, restaurants, and attractions
3. **Get AI Recommendations**: Chat with Moo AI for personalized travel advice
4. **Use Maps**: Pick locations with the integrated Google Maps
5. **Create Checklists**: Keep track of things to pack or remember
6. **Export Data**: Download your itinerary as an Excel file (if enabled)

### AI Assistant Features

- Ask for restaurant recommendations: "Find good Italian restaurants in Rome"
- Get activity suggestions: "What should I do in Tokyo for 3 days?"
- Weather and travel tips: "What's the weather like in Paris in March?"
- Local insights: "Tell me about local customs in Thailand"

### Map Features

- **Location Picker**: Click on the map to select precise locations
- **Place Search**: Search for specific venues, restaurants, or attractions
- **Trip Overview**: See all your planned locations on one map
- **Day View**: Focus on activities for a specific day

## 🛠️ Development

### Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (not recommended)

### Project Structure

```
holiday-moo/
├── src/
│   ├── components/     # React components
│   ├── config/         # App configuration
│   ├── services/       # API services
│   └── utils/          # Utility functions
├── public/             # Static assets
├── sample_data/        # Sample data for testing
├── config/             # Configuration files
├── .env.example        # Environment template
└── package.json        # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

All configuration is done through environment variables in the `.env` file:

- **AI Services**: Configure xAI and Perplexity API keys
- **Maps**: Set up Google Maps integration
- **Export Service**: Enable/disable Excel export functionality
- **Debug Mode**: Enable additional logging for development

### Sample Data

The app includes sample trip data in `sample_data/` to help you get started and test features.

## 🚨 Troubleshooting

### Common Issues

**"API key not found" errors**

- Make sure you've copied `.env.example` to `.env`
- Verify all required API keys are set in your `.env` file
- Check that API keys don't have extra spaces or quotes

**Maps not loading**

- Verify your Google Maps API key is correct
- Ensure you've enabled the required APIs in Google Cloud Console
- Check browser console for specific error messages

**AI responses not working**

- Confirm your xAI and Perplexity API keys are valid
- Check your API usage limits haven't been exceeded
- Verify your internet connection

**Build errors**

- Delete `node_modules/` and run `npm install` again
- Clear npm cache: `npm cache clean --force`
- Make sure you're using Node.js version 14 or higher

### Getting Help

1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure all required APIs are enabled in their respective consoles
4. Try running with sample data first to isolate issues

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. If you have access and want to contribute:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

**Happy travels with Holiday Moo! 🐄✈️**
