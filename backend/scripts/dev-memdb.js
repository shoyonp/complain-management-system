// Local development without MongoDB Atlas: boots an in-memory MongoDB and then
// starts the API against it. Data resets on every restart — for real local data
// set MONGODB_URI in .env and use `npm run dev`.
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri();
console.log(`[dev] In-memory MongoDB listening at ${process.env.MONGODB_URI}`);

await import('../src/server.js');

const stop = async () => {
  await mongod.stop();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
