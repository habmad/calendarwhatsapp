# GCal WhatsApp - Google Calendar to WhatsApp Automation

A comprehensive automation system that reads your Google Calendar and sends daily summaries and real-time change notifications via WhatsApp.

## 🚀 Features

- **Google Calendar Integration**: Secure OAuth2 authentication with Google Calendar API
- **Daily Summaries**: Automated daily schedule summaries sent via WhatsApp
- **Real-time Updates**: Instant notifications when calendar events change, are added, or cancelled
- **Smart Categorization**: Automatically categorizes events as WORK, PERSONAL, or FREE
- **Customizable Schedule**: Set your preferred time for daily summaries
- **Timezone Support**: Full timezone support for accurate scheduling
- **Modern Web Interface**: Beautiful React frontend for easy management
- **WhatsApp Business API**: Professional WhatsApp integration

## 📋 Prerequisites

Before running this application, you'll need:

1. **Google Cloud Console Project** with Calendar API enabled
2. **WhatsApp Business API** account and credentials
3. **Neon PostgreSQL** database (cloud)
4. **Node.js** (v16 or higher)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gcal-whatsapp
```

### 2. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://your-railway-app.up.railway.app/auth/google/callback

# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token_here

# Neon PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app

# WhatsApp Recipient (the person who will receive the messages)
DEFAULT_WHATSAPP_RECIPIENT=+1234567890
```

### 4. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3001/auth/google/callback` to authorized redirect URIs
6. Copy Client ID and Client Secret to your `.env` file

### 5. WhatsApp Business API Setup

1. Create a WhatsApp Business API account
2. Get your Access Token and Phone Number ID
3. Set up webhook verification
4. Add credentials to your `.env` file

### 6. Database Setup

Set up Neon PostgreSQL:

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string from your project dashboard
4. Update the `DATABASE_URL` in your `.env` file
5. Run the database migrations:

```bash
npm run db:migrate
```

### 7. Start the Application

```bash
# Development mode (runs both server and client)
npm run dev

# Or run separately:
# Server only
npm run server:dev

# Client only
cd client && npm start
```

The application will be available at:
- Frontend: http://localhost:3002
- Backend API: http://localhost:3001

## 📱 Usage

### 1. Initial Setup

1. Visit http://localhost:3002
2. Click "Continue with Google" to authenticate
3. Grant calendar permissions
4. Configure your WhatsApp recipient in Settings
5. Set your preferred daily summary time
6. Enable automation

### 2. Daily Summaries

The system will automatically send daily summaries at your specified time, including:
- First and last meeting times
- All appointments with times and locations
- Event categorization (WORK, PERSONAL, FREE)
- Total appointment count

### 3. Real-time Updates

When calendar changes occur, you'll receive instant WhatsApp notifications for:
- New events added
- Existing events modified
- Events cancelled

### 4. Manual Controls

- **Dashboard**: View today's schedule and automation status
- **Settings**: Configure WhatsApp recipient, timing, and preferences
- **Test Functions**: Send test messages and verify connections

## 🏗️ Architecture

### Backend (Node.js/Express)

```
server/
├── index.js              # Main server file
├── database/             # Database configuration
│   ├── config.js         # PostgreSQL connection
│   └── migrate.js        # Database migrations
├── models/               # Database models
│   ├── User.js          # User and OAuth tokens
│   └── CalendarEvent.js # Calendar events
├── routes/               # API routes
│   ├── auth.js          # Google OAuth
│   ├── calendar.js      # Calendar operations
│   ├── whatsapp.js      # WhatsApp messaging
│   └── automation.js    # Scheduled tasks
└── services/            # Business logic
    ├── calendarService.js    # Google Calendar API
    ├── whatsappService.js    # WhatsApp API
    └── automationService.js  # Cron jobs
```

### Frontend (React)

```
client/
├── src/
│   ├── components/      # React components
│   │   ├── Login.js     # OAuth login
│   │   ├── Dashboard.js # Main dashboard
│   │   ├── Settings.js  # User settings
│   │   └── Layout.js    # Navigation
│   ├── context/         # React context
│   └── index.js         # App entry point
└── public/              # Static files
```

## 🔧 API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/status` - Check authentication status
- `POST /auth/logout` - Logout user

### Calendar
- `GET /calendar/today` - Get today's events summary
- `GET /calendar/events` - Get events for date range
- `POST /calendar/sync` - Sync calendar events
- `GET /calendar/changes` - Check for changes

### WhatsApp
- `POST /whatsapp/send-test` - Send test message
- `POST /whatsapp/send-summary` - Send daily summary
- `POST /whatsapp/send-changes` - Send change notification
- `GET /whatsapp/test` - Test WhatsApp connection

### Automation
- `POST /automation/start` - Start automation
- `POST /automation/stop` - Stop automation
- `GET /automation/status` - Get automation status
- `POST /automation/trigger-summary` - Manual summary trigger

## 🚀 Deployment

### Railway + Vercel Deployment

This application is optimized for deployment on Railway (backend) and Vercel (frontend).

#### Quick Deploy

1. **Backend (Railway)**:
   - Connect your GitHub repo to Railway
   - Set environment variables in Railway dashboard
   - Railway will auto-deploy using the `Dockerfile`

2. **Frontend (Vercel)**:
   - Connect your GitHub repo to Vercel
   - Configure build settings for React app
   - Vercel will auto-deploy on every push

#### Detailed Instructions

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

### Manual Deployment

If you prefer to deploy manually:

1. **Environment Variables**: Update `.env` for production
2. **Database**: Use Neon PostgreSQL (already configured)
3. **HTTPS**: Automatic with Railway/Vercel
4. **Domain**: Update OAuth redirect URIs
5. **Build**: Run `npm run build` in client directory

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN cd client && npm ci && npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔒 Security Features

- **OAuth 2.0**: Secure Google authentication
- **Session Management**: Server-side sessions with MongoDB
- **Token Refresh**: Automatic Google token refresh
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Configured CORS policies
- **Environment Variables**: Secure credential management

## 🐛 Troubleshooting

### Common Issues

1. **Google OAuth Error**: Check redirect URI configuration
2. **WhatsApp Connection Failed**: Verify API credentials
3. **Database Connection**: Ensure MongoDB is running
4. **Port Conflicts**: Check if ports 3002/3001 are available

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Logs

Check server logs for detailed error information:

```bash
npm run server:dev
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Note**: This application requires proper Google Calendar API and WhatsApp Business API setup. Follow the setup instructions carefully to ensure all integrations work correctly. 