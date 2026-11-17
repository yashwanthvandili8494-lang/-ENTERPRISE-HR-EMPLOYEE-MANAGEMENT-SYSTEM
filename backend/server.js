const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

async function startServer() {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`Enterprise HR Backend running on port ${env.PORT} (${env.NODE_ENV})`);
    });

    const shutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
