require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function resetDb() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name).filter((name) => !name.startsWith("system."));

  if (collectionNames.length === 0) {
    console.log("No collections found to drop.");
    await mongoose.disconnect();
    return;
  }

  for (const name of collectionNames) {
    console.log(`Dropping collection: ${name}`);
    await db.dropCollection(name).catch((err) => {
      console.warn(`Unable to drop collection ${name}: ${err.message}`);
    });
  }

  console.log("Database reset complete.");
  await mongoose.disconnect();
}

resetDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
