const proxy = require('express-http-proxy');
const CircuitBreaker = require('opossum');
const logger = require('../config/logger');

// Registry of Circuit Breakers per target service URL
const breakers = new Map();

/**
 * Returns or initializes a Circuit Breaker for a given target service URL
 * @param {string} targetUrl Downstream microservice URL
 */
const getCircuitBreaker = (targetUrl) => {
  if (breakers.has(targetUrl)) {
    return breakers.get(targetUrl);
  }

  // Action function wrapped by Circuit Breaker: Performs raw HTTP fetch to downstream target
  const sendRequest = async ({ req, res, next }) => {
    return new Promise((resolve, reject) => {
      const proxyMiddleware = proxy(targetUrl, {
        proxyReqPathResolver: (r) => r.originalUrl,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
          proxyReqOpts.headers['x-forwarded-for'] = srcReq.ip;
          if (srcReq.user) {
            proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
            proxyReqOpts.headers['x-user-email'] = srcReq.user.email;
          }
          return proxyReqOpts;
        },
        proxyErrorHandler: (err, resRef, nextRef) => {
          reject(err);
        },
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
          // Downstream 5xx server errors trigger Circuit Breaker failure counter
          if (proxyRes.statusCode >= 500) {
            reject(new Error(`Downstream service returned ${proxyRes.statusCode}`));
          } else {
            resolve(proxyResData);
          }
          return proxyResData;
        },
      });

      proxyMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // Circuit Breaker Options
  const breakerOptions = {
    timeout: 5000, // 5 seconds request timeout
    errorThresholdPercentage: 50, // Trip if 50% of requests fail
    resetTimeout: 60000, // Stay OPEN for 60s before HALF-OPEN probe
    capacity: 5, // Require at least 5 requests before calculating failure rate
  };

  const breaker = new CircuitBreaker(sendRequest, breakerOptions);

  // Circuit Breaker State Event Listeners
  breaker.on('open', () => {
    logger.error(`[CIRCUIT BREAKER OPEN] Circuit TRIPPED OPEN for target: ${targetUrl}. Traffic blocked for 60s.`);
  });

  breaker.on('halfOpen', () => {
    logger.warn(`[CIRCUIT BREAKER HALF-OPEN] Testing recovery probe for target: ${targetUrl}.`);
  });

  breaker.on('close', () => {
    logger.info(`[CIRCUIT BREAKER CLOSED] Downstream target: ${targetUrl} recovered. Normal operation resumed.`);
  });

  breaker.on('fallback', (result, err) => {
    logger.warn(`[CIRCUIT BREAKER FALLBACK] Circuit open/fallback executed for target: ${targetUrl}`);
  });

  // Define Fallback response when Circuit is OPEN
  breaker.fallback((params, err) => {
    const { res } = params;
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: 'Target microservice is currently unavailable (Circuit Breaker OPEN). Please try again later.',
        circuitBreakerState: 'OPEN',
      });
    }
  });

  breakers.set(targetUrl, breaker);
  return breaker;
};

/**
 * Creates reverse proxy middleware integrated with Circuit Breaker resiliency
 * @param {string} targetUrl Downstream microservice URL
 */
const createProxy = (targetUrl) => {
  const breaker = getCircuitBreaker(targetUrl);

  return async (req, res, next) => {
    try {
      await breaker.fire({ req, res, next });
    } catch (error) {
      // If breaker falls back or errors out, fallback handler produces response
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'Downstream microservice failed or unavailable',
          error: error.message,
        });
      }
    }
  };
};

module.exports = createProxy;
