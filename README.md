# Import Documents

This is an application showcasing how you can implement Importing Documents file storages or knowledge bases using [Integration.app](https://integration.app). The app is built with Next.js/React.

## Prerequisites

- Node.js 18+ installed
- Integration.app workspace credentials (Workspace Key and Secret)
- (if needed)Unstructured.io API key for markdown extraction from files

## Setup

1. Clone the repository:
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

```bash
# Copy the sample environment file
cp .env-sample .env
```

4. Edit `.env` and add your Integration.app credentials:

```env
INTEGRATION_APP_WORKSPACE_KEY=your_workspace_key_here
INTEGRATION_APP_WORKSPACE_SECRET=your_workspace_secret_here
MONGODB_URI=your_mongodb_connection_string
```

You can find these credentials in your Integration.app workspace settings.

## Running the Application

1. Start the development server:

```bash
npm run dev
# or
yarn dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.
## Project Structure

- `/src/app` - Next.js app router pages and API routes
  - `/knowledge` - Document management and viewing interface
  - `/api` - Backend API routes for documents and integration management
    - `/documents` - Document CRUD operations and content management
    - `/integrations` - Integration token and connection management
- `/src/components` - Reusable React components
  - `/document-viewer` - Document content viewer component
  - `/ui` - Shared UI components using Shadcn UI
- `/src/lib` - Utility functions and helpers
  - `/mongodb` - Database connection and utilities
  - `/integration-app-client` - Integration.app API client
  - `/server-auth` - Authentication utilities
- `/src/models` - Data models and types
  - `/document` - Document schema and types
  - `/knowledge` - Knowledge base types
- `/public` - Static assets and images

## Template Features

### Authentication

The template implements 2 simpleauthentication mechanisms:
The template implements 2 simple authentication mechanisms:

1. Integration.app token
2. Default auth

The Integration.app token is used to authenticate requests from the Integration.app platform. The default auth is used to authenticate requests from the frontend.
Default auth uses a randomly generated UUID as the customer ID. This simulates a real-world scenario where your application would have proper user authentication. The customer ID is used to:

- Identify the user/customer in the integration platform
- Generate integration tokens for external app connections
- Associate imported data with specific customers



### Importing Documents Example
The template includes a complete example of importing documents from external sources:

1. **Integration Setup**
   - Connect to external document providers (e.g., Google Drive, Dropbox)
   - Securely store integration tokens and credentials
   - Handle OAuth flows and token refresh

2. **Document Import Flow**
   - Select documents from connected sources
   - Import metadata and content
   - Convert to standardized format
   - Store in MongoDB with customer association

3. **Content Processing**
   - Extract text content from various file formats using Integration.app and Unstructured.io 

4. **User Interface**
  - Integrations list
   - Creating new Integration connection
   - Document picker interface (both folders and single documents)
   - Import progress tracking

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## License

MIT
