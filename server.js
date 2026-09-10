import app from "./src/app.js";
import { port } from "./src/config/env.js";
import { setupDatabase } from "./src/db/setup.js";

try {
  await setupDatabase();
  app.listen(port, () => {
    console.log(`Shop running on http://localhost:${port}`);
  });
} catch (error) {
  console.error("The server could not start:", error.message);
  process.exit(1);
}
