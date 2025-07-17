# Deployment Guide - Vercel + Railway

This application is designed to be deployed with the frontend on Vercel and the backend on Railway.

## 🚀 Quick Deploy

### 1. Backend Deployment (Railway)

1. **Connect to Railway**:
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Configure Environment Variables**:
   ```env
   DATABASE_URL=postgresql://neondb_owner:npg_zOHQmCRP1kx5@ep-dry-salad-aey4s01z-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   NODE_ENV=production
   PORT=3001
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=https://your-railway-app.up.railway.app/auth/google/callback
   FRONTEND_URL=https://your-app.vercel.app
   JWT_SECRET=your_jwt_secret
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   TWILIO_WHATSAPP_CONTENT_SID=your_content_sid
   ```

3. **Deploy**: Railway will automatically deploy using the `Dockerfile`

### 2. Frontend Deployment (Vercel)

1. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project" → "Import Git Repository"
   - Select your repository

2. **Configure Build Settings**:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (root of repo)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/build`

3. **Environment Variables** (if needed):
   ```env
   REACT_APP_API_URL=https://your-railway-app.up.railway.app
   ```

4. **Deploy**: Vercel will automatically deploy and provide a URL

## 🔧 Configuration

### Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://your-railway-app.up.railway.app/auth/google/callback`

### Update Environment Variables

After deployment, update your Railway environment variables:

1. **Backend (Railway)**:
   - `FRONTEND_URL`: Your Vercel app URL (e.g., `https://gcal-whatsapp.vercel.app`)
   - `GOOGLE_REDIRECT_URI`: Your Railway app URL + `/auth/google/callback`

2. **Frontend (Vercel)**:
   - No environment variables needed (API calls are proxied)

## 🔍 Testing the Deployment

1. **Test Backend**: Visit `https://your-railway-app.up.railway.app/health`
2. **Test Frontend**: Visit your Vercel URL
3. **Test OAuth**: Try logging in with Google

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure Railway CORS settings include your Vercel domain
   - Check that `credentials: true` is set

2. **Session Issues**:
   - Verify `JWT_SECRET` is set in Railway
   - Check that cookies are being set properly

3. **OAuth Redirect Issues**:
   - Ensure `GOOGLE_REDIRECT_URI` points to Railway backend
   - Verify Google OAuth settings include the correct redirect URI

### Debug Endpoints

- **Backend Health**: `https://your-railway-app.up.railway.app/health`
- **Session Debug**: `https://your-railway-app.up.railway.app/auth/debug-session`
- **Auth Status**: `https://your-railway-app.up.railway.app/auth/status`

## 📝 Environment Variables Reference

### Railway (Backend)
```env
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-railway-app.up.railway.app/auth/google/callback
FRONTEND_URL=https://your-app.vercel.app
JWT_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_CONTENT_SID=...
```

### Vercel (Frontend)
```env
# Usually not needed - API calls are proxied
REACT_APP_API_URL=https://your-railway-app.up.railway.app
```

## 🔄 Continuous Deployment

Both Railway and Vercel support automatic deployments:

- **Railway**: Deploys on every push to main branch
- **Vercel**: Deploys on every push to main branch

## 📊 Monitoring

- **Railway**: Built-in logs and metrics
- **Vercel**: Built-in analytics and performance monitoring
- **Database**: Neon PostgreSQL dashboard for database monitoring

## 🔒 Security

- **HTTPS**: Automatically enabled on both platforms
- **Environment Variables**: Securely stored on both platforms
- **CORS**: Properly configured for cross-domain requests
- **Sessions**: Stored in PostgreSQL with secure cookies 