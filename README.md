# Import Documents

This is an application showcasing how you can implement Importing Documents file storages or knowledge bases using [Integration.app](https://integration.app). The app is built with Next.js/React.

[Demo](https://documents-example.vercel.app/)

## Prerequisites

- Node.js 18+
- Integration.app workspace credentials (Workspace Key and Secret). [Get credentials](https://console.integration.app/settings/workspace) from the workspace settings.
- MongoDB connection string (We provide a docker-compose file to spin up a local MongoDB instance. See [Using mongodb via Docker](#using-mongodb-via-docker) for more details.)
- AWS credentials (for S3)

## Setup

### 1. **Clone repository & Install dependencies:**

```bash
npm install
# or
yarn install
```

### 2. **Set up environment variables file:**

```bash
# Copy the sample environment file
cp .env-sample .env
```

### 3. **Add your credentials to the `.env` file:**

> Note: The following credentials are optional but enable additional features:

- **AWS S3**: Enables file download and storage in S3
- **Unstructured.io**: Enables text extraction from PDFs, Word documents, and other file formats

### 4. **Add the Scenario to Your Workspace:**

This application relies on predefined [flows](https://console.integration.app/docs/building/blocks/flows), [actions](https://console.integration.app/docs/building/blocks/actions), and other primitives, all organized within a **Scenario**— our structured way of managing universal integrations.

To use the same flow and actions in your workspace, navigate to the [Continuously Import Content to My App Scenario](https://integration.app/scenarios/continuously-import-content-to-my-app) and click the **"Add to App"** button. This will add the required flows and actions, data sources and other primitives to your workspace.

### 5. Configure your apps
This Scenario works across 8 apps. For most app to work you'll need to provide configuration parameters. The configuration guide for each apps explains how to get the credentials needed



https://github.com/user-attachments/assets/272197b4-aea9-40ff-a444-ac0fa17f672f




### 6. **Start the development server:**

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Using mongodb via Docker

### Prerequisites

- Docker and Docker Compose installed on your machine

### Setting up MongoDB

If you want to use MongoDB via Docker, you can do so by running the following command:


```bash
docker-compose up
```

You can now use the `MONGODB_URI` environment variable to connect to the database:

```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/knowledge
```

## License

MIT
