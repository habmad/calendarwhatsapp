# Deployment Guide: Railway + Vercel

This guide will help you deploy the GCal WhatsApp application using Railway for the backend API and Vercel for the React frontend.

## 🚀 Architecture Overview

- **Backend (Railway)**: Node.js/Express API with Neon PostgreSQL
- **Frontend (Vercel)**: React application with Tailwind CSS
- **Database (Neon)**: PostgreSQL database (already configured)

## 📋 Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Neon Database**: Set up your PostgreSQL database
3. **Google OAuth**: Configure Google Cloud Console
4. **WhatsApp Business API**: Set up WhatsApp credentials

## 🛠️ Railway Deployment (Backend)

### 1. Create Railway Account
- Go to [Railway](https://railway.app/)
- Sign up with your GitHub account

### 2. Deploy Backend
1. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Environment Variables**:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=https://your-railway-app.railway.app/auth/google/callback
   
   # WhatsApp Business API
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
   WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_here
   
   # Production Settings
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-app.vercel.app
   
   # Default WhatsApp Recipient
   DEFAULT_WHATSAPP_RECIPIENT=+1234567890
   ```

3. **Deploy**:
   - Railway will automatically detect the Node.js app
   - It will use the `Dockerfile` for deployment
   - The app will be available at `https://your-railway-app.railway.app`

### 3. Run Database Migrations
After deployment, run the database migrations:
```bash
# Connect to Railway CLI
railway login
railway link

# Run migrations
railway run npm run db:migrate
```

## 🌐 Vercel Deployment (Frontend)

### 1. Create Vercel Account
- Go to [Vercel](https://vercel.com/)
- Sign up with your GitHub account

### 2. Deploy Frontend
1. **Import Project**:
   - Click "New Project"
   - Import your GitHub repository
   - Set the following configuration:
     - **Framework Preset**: Create React App
     - **Root Directory**: `./` (root)
     - **Build Command**: `cd client && npm install && npm run build`
     - **Output Directory**: `client/build`

2. **Configure Environment Variables**:
   ```env
   REACT_APP_API_URL=https://your-railway-app.railway.app
   ```

3. **Deploy**:
   - Vercel will build and deploy your React app
   - The app will be available at `https://your-app.vercel.app`

## 🔧 Configuration Updates

### 1. Update Google OAuth Redirect URIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add these redirect URIs:
   ```
   https://your-railway-app.railway.app/auth/google/callback
   https://your-app.vercel.app/auth/google/callback
   ```

### 2. Update WhatsApp Webhook
1. Go to your WhatsApp Business API dashboard
2. Set the webhook URL to:
   ```
   https://your-railway-app.railway.app/whatsapp/webhook
   ```

### 3. Update Vercel Configuration
Update `vercel.json` with your actual Railway URL:
```json
{
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/build",
  "framework": "create-react-app",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-railway-app.railway.app/$1"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "https://your-railway-app.railway.app"
  }
}
```

## 🔄 Continuous Deployment

### Railway (Backend)
- **Automatic**: Deploys on every push to main branch
- **Manual**: Deploy from Railway dashboard
- **Rollback**: Available in Railway dashboard

### Vercel (Frontend)
- **Automatic**: Deploys on every push to main branch
- **Preview**: Creates preview deployments for pull requests
- **Rollback**: Available in Vercel dashboard

## 📊 Monitoring & Logs

### Railway
- **Logs**: Available in Railway dashboard
- **Metrics**: CPU, memory, and network usage
- **Health Checks**: Automatic health monitoring

### Vercel
- **Analytics**: Built-in analytics dashboard
- **Performance**: Core Web Vitals monitoring
- **Logs**: Function logs and error tracking

## 🔒 Security Considerations

### Environment Variables
- ✅ Never commit `.env` files
- ✅ Use Railway/Vercel environment variable management
- ✅ Rotate secrets regularly

### SSL/TLS
- ✅ Railway provides automatic HTTPS
- ✅ Vercel provides automatic HTTPS
- ✅ No additional SSL configuration needed

### CORS Configuration
The backend is configured to accept requests from:
- Development: `http://localhost:3000`
- Production: Your Vercel domain

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   ```bash
   # Check Neon connection
   railway run node -e "require('./server/database/config').query('SELECT NOW()', console.log)"
   ```

2. **OAuth Redirect Issues**:
   - Verify redirect URIs in Google Cloud Console
   - Check `GOOGLE_REDIRECT_URI` environment variable

3. **WhatsApp Webhook Issues**:
   - Verify webhook URL in WhatsApp dashboard
   - Check `WHATSAPP_VERIFY_TOKEN` environment variable

4. **Build Failures**:
   - Check build logs in Vercel dashboard
   - Verify all dependencies are in `package.json`

### Debug Commands
```bash
# Railway CLI
railway logs
railway status
railway run npm run db:migrate

# Vercel CLI
vercel logs
vercel ls
```

## 💰 Cost Optimization

### Railway
- **Free Tier**: $5/month credit
- **Pro Tier**: Pay-as-you-use
- **Optimization**: Use sleep mode for development

### Vercel
- **Free Tier**: Generous limits for personal projects
- **Pro Tier**: $20/month for teams
- **Optimization**: Use edge functions for better performance

### Neon
- **Free Tier**: 3GB storage, 0.5GB RAM
- **Pro Tier**: $10/month for more resources
- **Optimization**: Use connection pooling

## 🎯 Next Steps

1. **Set up monitoring**: Configure alerts for downtime
2. **Add custom domain**: Configure your own domain
3. **Set up CI/CD**: Configure GitHub Actions if needed
4. **Backup strategy**: Set up database backups
5. **Performance monitoring**: Add application monitoring

## 📞 Support

- **Railway**: [Discord](https://discord.gg/railway) or [Documentation](https://docs.railway.app/)
- **Vercel**: [Support](https://vercel.com/support) or [Documentation](https://vercel.com/docs)
- **Neon**: [Discord](https://discord.gg/neondatabase) or [Documentation](https://neon.tech/docs)

---

**Note**: Replace `your-railway-app.railway.app` and `your-app.vercel.app` with your actual deployment URLs. 