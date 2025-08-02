# Mineserver
<p>
  <a href="https://mineflared.theushen.me"><img src="https://vercelbadge.vercel.app/api/TheusHen/Mineserver" alt="Build Status" /></a>
  <a href="https://github.com/TheusHen/Mineserver"><img src="https://img.shields.io/github/license/TheusHen/Mineserver?style=flat-square" alt="License" /></a>
</p>

> [!IMPORTANT]  
> Actualy hosted in Render(free) future will be hosted in an Oracle Cloud instance.
```mermaid
graph LR
    R[Render (Free Tier)] --> O[Oracle Cloud (Always Free VPS)]
    R:::host
    O:::host

    classDef host fill:#f0f0f0,stroke:#ccc,stroke-width:1px,font-size:14px;
```


An Express-based API server to manage Minecraft server subdomains using Cloudflare DNS.

## Description

Mineserver is a backend service that allows users to authenticate via GitHub and create subdomains for their Minecraft servers. It manages DNS records via the Cloudflare API and stores user data in MongoDB.

## Features

- GitHub OAuth authentication
- Automatic creation and management of subdomains via Cloudflare
- User management with MongoDB
- Server status verification
- Automatic cleanup of inactive GitHub users
- Secure CORS policies (only [mineflared.theushen.me](https://mineflared.theushen.me) can access most endpoints)
- Access control by user IP and JWT

## Prerequisites

- Node.js 18 or higher
- MongoDB
- Cloudflare account with API access
- GitHub OAuth application

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/TheusHen/mineserver.git
   cd mineserver
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root with the following variables:
   ```
   MONGO_URI=mongodb://localhost:27017
   MONGODB_DATABASE_NAME=mineflared
   CLOUDFLARE_API_TOKEN=your_cloudflare_token
   CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRATION=1d
   CLOUDFLARE_TTL=120
   CLOUDFLARE_PROXIED=true
   DOMAIN=mineflared.theushen.me
   GITHUB_API_URL=https://api.github.com
   GITHUB_OAUTH_URL=https://github.com/login/oauth
   PORT=3000
   ```

## Running the Application

### Development Mode

```
npm run dev
```

### Production Mode

```
npm start
```

## API Endpoints

### Authentication

- `GET /auth/github/login` - Redirects to GitHub login
- `GET /auth/github/callback` - GitHub OAuth callback

### User Management

- `GET /api/user` - Get authenticated user information (only accessible by the user's registered IP)
- `DELETE /delete` - Remove user account and DNS records (only accessible by the user's registered IP)

### DNS Management

- `POST /create` - Create or update subdomain (JWT required)
- `GET /status` - Check server status (only accessible from https://mineflared.theushen.me)

### Root

- `GET /` - Health check endpoint (public)

## Security

- All endpoints implement strict CORS and access controls.
- Most endpoints are only accessible via [mineflared.theushen.me](https://mineflared.theushen.me).
- User and DNS management endpoints require proper authentication and IP verification.
- Auth endpoints are open but protected against common attacks.

## Tests

Run tests with:

```
npm test
```

## Project Structure

- `app.js` - Main application entry point
- `routes/` - API route handlers
- `middlewares/` - Authentication, CORS, and access control middlewares
- `utils/` - Utility functions
- `jobs/` - Background jobs
- `test/` - Test files

## License

This project is licensed under the MIT License - see the LICENSE file for details.
