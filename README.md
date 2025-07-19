# Mineserver

A Fastify-based API server for managing Minecraft server subdomains using Cloudflare DNS.

## Description

Mineserver is a backend service that allows users to authenticate with GitHub and create subdomains for their Minecraft servers. It manages DNS records through the Cloudflare API and stores user data in MongoDB.

## Features

- GitHub OAuth authentication
- Automatic subdomain creation and management via Cloudflare
- User management with MongoDB
- Server status checking
- Automatic cleanup of inactive GitHub users

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

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/mineflared
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
   CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRATION=
   CLOUDFLARE_TTL=
   CLOUDFLARE_PROXIED=true
   GITHUB_API_URL=https://api.github.com
   GITHUB_OAUTH_URL=https://github.com/login/oauth/access_token
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

- `GET /auth/github/callback` - GitHub OAuth callback

### User Management

- `GET /api/user` - Get current user information
- `DELETE /delete` - Delete user account and DNS records

### DNS Management

- `POST /create` - Create or update a subdomain
- `GET /status` - Check server status

## Testing

Run the tests with:

```
npm test
```

## Project Structure

- `app.js` - Main application entry point
- `routes/` - API route handlers
- `utils/` - Utility functions
- `jobs/` - Background jobs
- `test/` - Test files

## License

This project is licensed under the ISC License - see the LICENSE file for details.