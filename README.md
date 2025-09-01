# SUMO Traffic Management Dashboard

A real-time traffic management dashboard that integrates with SUMO (Simulation of Urban Mobility) to provide live traffic visualization, monitoring, and control capabilities.

## 🚀 Project Overview

This application provides a comprehensive traffic management solution with real-time SUMO simulation integration, featuring interactive maps, traffic analytics, and emergency vehicle tracking. Built with modern web technologies for optimal performance and user experience.

**Project URL**: https://lovable.dev/projects/1d8e7b15-0c4f-4530-82f4-8674d6d503b1

## 🏗️ Architecture

```
Frontend (React/TypeScript) ↔ Backend (Node.js/Express) ↔ SUMO Simulation
         ↓                           ↓                        ↓
    Leaflet Maps              WebSocket Server           TraCI Protocol
    Real-time UI              Data Processing           Traffic Data
```

## 📁 Project Structure

```
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── ControlPanel.tsx
│   │   ├── IntersectionStatus.tsx
│   │   ├── MapLayers.tsx
│   │   ├── StatisticsPanel.tsx
│   │   ├── SUMOConnectionStatus.tsx
│   │   ├── SystemLog.tsx
│   │   └── TrafficMap.tsx
│   ├── contexts/            # React contexts
│   │   └── SUMOContext.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useSUMOData.ts
│   │   └── use-mobile.tsx
│   ├── lib/                 # Utility libraries
│   │   └── utils.ts
│   ├── pages/               # Page components
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   └── services/            # API services
│       ├── SUMOCommandService.ts
│       ├── SUMODataService.ts
│       └── SUMOIntegrationTest.ts
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── services/       # Backend services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── python-bridge/      # Python SUMO integration
├── public/                 # Static assets
├── AddisAbabaSumo/        # SUMO simulation files
└── docs/                  # Documentation
```

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **React Leaflet** - Interactive maps
- **React Query** - Server state management
- **React Router** - Client-side routing

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **WebSocket** - Real-time communication
- **TypeScript** - Type-safe backend development
- **Zod** - Runtime type validation

### SUMO Integration

- **TraCI Protocol** - SUMO control interface
- **Python Bridge** - SUMO-Python integration
- **Real-time Data Streaming** - Live traffic updates

## 🚦 Key Features

### Real-time Traffic Monitoring

- Live vehicle tracking and visualization
- Traffic light status monitoring
- Road congestion analysis
- Intersection performance metrics

### Interactive Map Interface

- Leaflet-based interactive maps
- Multiple map layers and views
- Vehicle clustering and filtering
- Real-time position updates

### SUMO Integration

- Direct connection to SUMO simulations
- TraCI protocol implementation
- Real-time data synchronization
- Simulation control capabilities

### Dashboard Components

- **Control Panel** - Simulation controls and settings
- **Statistics Panel** - Traffic analytics and metrics
- **System Log** - Real-time event logging
- **Connection Status** - SUMO connectivity monitoring

### Performance Features

- Optimized rendering with React 18
- Efficient data streaming
- Memory management
- Responsive design

## 🚀 Getting Started

### Quick Start (Recommended)

Use the automated setup script for development:

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Run the setup script (handles all dependencies and configuration)
./setup-dev.sh

# Start all services
./start-dev.sh
```

### Manual Installation

#### Prerequisites

- **Node.js 18+** and npm
- **Python 3.8+** with pip
- **SUMO simulation software** (optional - can use mock data mode)
- **Docker** (optional - for containerized deployment)

#### Step-by-Step Setup

1. **Clone and prepare the repository**

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Set up environment files**

```bash
# Frontend environment
cp .env.example .env.local

# Backend environment
cp backend/.env.example backend/.env
```

3. **Install dependencies**

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Python bridge dependencies
cd backend/python-bridge
pip install -r requirements.txt
cd ../..
```

### Development

1. **Start the backend server**

```bash
cd backend
npm run dev
```

2. **Start the frontend development server**

```bash
npm run dev
```

3. **Access the application**

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001

### SUMO Setup

1. **Install SUMO** following the official documentation
2. **Configure SUMO simulation** in the AddisAbabaSumo directory
3. **Start SUMO with TraCI enabled**
4. **Connect via the dashboard settings panel**

## 📊 Available Scripts

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Backend

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests

## 🔧 Configuration

### Frontend Configuration

- **Vite Config** - `vite.config.ts`
- **Tailwind Config** - `tailwind.config.ts`
- **TypeScript Config** - `tsconfig.json`

### Backend Configuration

- **Environment Variables** - `backend/.env`
- **TypeScript Config** - `backend/tsconfig.json`
- **SUMO Settings** - Configurable via UI

## 🧪 Testing

The project includes comprehensive testing:

- Unit tests for services and utilities
- Integration tests for SUMO connectivity
- Component testing for React components

Run tests:

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test
```

## 📈 Performance Optimization

- **Code Splitting** - Automatic route-based splitting
- **Tree Shaking** - Unused code elimination
- **Asset Optimization** - Image and bundle optimization
- **Caching** - Efficient data caching strategies
- **Memory Management** - Automatic cleanup of resources

## 🔒 Security Features

- Input validation with Zod
- CORS configuration
- Environment variable protection
- Error boundary implementation
- Secure WebSocket connections

## 🚀 Deployment

### Quick Production Deployment (Docker)

```bash
# Deploy with all services
./deploy.sh -e production -m -s -r

# Deploy basic stack only
./deploy.sh

# Deploy with monitoring
./deploy.sh --monitoring
```

### Docker Compose Deployment

1. **Basic deployment:**
```bash
cp .env.production .env
docker-compose up -d
```

2. **With monitoring stack:**
```bash
COMPOSE_PROFILES=monitoring docker-compose up -d
```

3. **With SUMO simulation:**
```bash
COMPOSE_PROFILES=with-sumo docker-compose up -d
```

### Manual Production Deployment

#### Frontend (Static Hosting)

1. **Build the application:**
```bash
npm run build
```

2. **Deploy to static hosting:**
   - Upload `dist/` folder to your web server
   - Configure web server for SPA routing
   - Set up HTTPS with proper certificates

#### Backend (Server Deployment)

1. **Prepare the server:**
```bash
cd backend
npm run build
cp -r dist/ /opt/sumo-backend/
cp package*.json /opt/sumo-backend/
cp -r python-bridge/ /opt/sumo-backend/
```

2. **Set up process manager:**
```bash
# Using PM2
npm install -g pm2
pm2 start dist/server.js --name sumo-backend

# Using systemd
sudo systemctl enable sumo-backend
sudo systemctl start sumo-backend
```

### Cloud Platform Deployment

#### AWS Deployment

- **Frontend**: Deploy to S3 + CloudFront
- **Backend**: Deploy to ECS or EC2
- **Database**: Use RDS for persistent data
- **Load Balancer**: Use ALB for traffic distribution

#### Google Cloud Platform

- **Frontend**: Deploy to Cloud Storage + Cloud CDN
- **Backend**: Deploy to Cloud Run or Compute Engine
- **Database**: Use Cloud SQL
- **Load Balancer**: Use Cloud Load Balancing

#### Azure Deployment

- **Frontend**: Deploy to Static Web Apps
- **Backend**: Deploy to Container Instances or App Service
- **Database**: Use Azure Database
- **Load Balancer**: Use Azure Load Balancer

### Environment Configuration

#### Production Environment Variables

**Frontend (.env.production):**
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_WEBSOCKET_URL=wss://api.yourdomain.com/ws
VITE_ENABLE_DEBUG_LOGGING=false
VITE_MOCK_DATA_MODE=false
```

**Backend (.env):**
```env
NODE_ENV=production
SERVER_PORT=3001
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
LOG_LEVEL=info
ENABLE_ACCESS_LOGS=true
```

### Health Checks and Monitoring

The application includes comprehensive health checks:

- **Frontend**: `/health` endpoint
- **Backend**: `/health` and `/api/sumo/stats`
- **Python Bridge**: `/health` endpoint
- **Database**: Connection health monitoring

### Load Balancing and Scaling

#### Horizontal Scaling

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
  
  frontend:
    deploy:
      replicas: 2
```

#### Load Balancer Configuration

```nginx
upstream backend {
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Security Configuration

#### SSL/TLS Setup

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

### Backup and Recovery

#### Database Backups

```bash
#!/bin/bash
# Backup script
BACKUP_DIR="/opt/backups/sumo-dashboard"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" \
    /opt/sumo-backend/ \
    /etc/nginx/sites-available/sumo-dashboard

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
```

### Custom Domain Setup

1. **Configure DNS records:**
```
A     yourdomain.com        -> YOUR_SERVER_IP
CNAME api.yourdomain.com    -> yourdomain.com
CNAME www.yourdomain.com    -> yourdomain.com
```

2. **Set up SSL certificate:**
```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

3. **Update environment variables with your domain**

## 📚 Documentation

- **SUMO Integration** - See `SUMO_INTEGRATION.md`
- **API Documentation** - Available in backend/docs
- **Component Documentation** - Inline JSDoc comments
- **Architecture Guide** - See architecture section above

## 🤝 Development Workflow

### Using Lovable

Visit the [Lovable Project](https://lovable.dev/projects/1d8e7b15-0c4f-4530-82f4-8674d6d503b1) and start prompting. Changes are automatically committed.

### Using Local IDE

1. Make changes locally
2. Test thoroughly
3. Commit and push changes
4. Changes will reflect in Lovable

### Using GitHub Codespaces

1. Click "Code" → "Codespaces" → "New codespace"
2. Edit files directly in the browser
3. Commit and push when done

## 🐛 Troubleshooting

### Common Issues

- **SUMO Connection Failed** - Check SUMO is running with TraCI enabled
- **WebSocket Errors** - Verify backend server is running
- **Map Not Loading** - Check internet connection and Leaflet configuration
- **Build Errors** - Clear node_modules and reinstall dependencies

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=true
LOG_LEVEL=debug
```

## 🔮 Future Enhancements

- Historical traffic data analysis
- Advanced traffic prediction algorithms
- Mobile application support
- Multi-city simulation support
- Enhanced emergency vehicle routing
- Traffic optimization recommendations

## 📄 License

This project is private and proprietary. All rights reserved.

## 👥 Contributing

This is a private project. For internal development guidelines, see the development workflow section above.

---

Built with ❤️ using React, TypeScript, and SUMO integration
