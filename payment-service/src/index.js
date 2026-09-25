const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./config/logger');
const { connectKafka } = require('./config/kafka');
const paymentRoutes = require('./routes/payment.routes');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/v1/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'payment-service', message: 'Payment service operational' });
});

// Start Server
app.listen(config.port, async () => {
  logger.info(`[PAYMENT-SERVICE] Running on port ${config.port} in ${config.env} mode`);
  await connectKafka();
});
