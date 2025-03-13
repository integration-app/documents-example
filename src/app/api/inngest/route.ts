import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { inngest_downloadAndExtractTextFromFile } from "../webhooks/on-download-complete/route";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [inngest_downloadAndExtractTextFromFile],
});
