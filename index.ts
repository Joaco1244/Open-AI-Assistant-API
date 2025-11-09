import dotenv from "dotenv";
dotenv.config();

import { createServer } from "./server";
import logger from "./utils/logger";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createServer();

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});