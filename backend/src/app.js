import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from './config/env.js';
import routes from './routes/index.js';
import interactionsRoute from './routes/interactions.route.js';
import { publicRateLimiter } from './middlewares/rate-limit.middleware.js';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js';
import { AppError } from './utils/app-error.util.js';

const app = express();

// Trust the first hop (ngrok locally, Render's proxy in prod) so
// express-rate-limit reads X-Forwarded-For instead of rejecting it.
app.set('trust proxy', 1);

app.use(helmet());

// Minimal ping target for uptime cron — plain text, no JSON/DB/CORS
// involvement, so there's nothing that can bloat the response.
app.get('/', (req, res) => res.status(200).send('OK'));

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      // No Origin header = same-origin, curl, server-to-server, health
      // checks — not something a browser sends, so nothing to restrict.
      if (!origin || env.corsOrigin.includes(origin)) {
        callback(null, true);
      } else {
        // AppError, not a plain Error — this is an expected rejection, not
        // a bug, so it should return a clean 403 through the errorMiddleware's
        // isOperational branch rather than a 500 with a logged stack trace.
        callback(new AppError('Not allowed by CORS', 403));
      }
    },
  }),
);

// Mounted before express.json(): signature verification needs the raw,
// unparsed request body.
app.use('/api/interactions', interactionsRoute);

app.use(express.json());
app.use(publicRateLimiter);

app.use('/api', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
