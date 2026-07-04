import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from './config/env.js';
import routes from './routes/index.js';
import interactionsRoute from './routes/interactions.route.js';
import { publicRateLimiter } from './middlewares/rate-limit.middleware.js';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware.js';

const app = express();

// Trust the first hop (ngrok locally, Render's proxy in prod) so
// express-rate-limit reads X-Forwarded-For instead of rejecting it.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));

// Mounted before express.json(): signature verification needs the raw,
// unparsed request body.
app.use('/api/interactions', interactionsRoute);

app.use(express.json());
app.use(publicRateLimiter);

app.use('/api', routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
