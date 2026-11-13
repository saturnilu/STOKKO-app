const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response'); 

const getDashboardInsights = async (req, res) => {
  try {
    const userId = req.user.id; 
    const [spendingRows] = await db.query(
      `SELECT SUM(total) as total_spent FROM orders WHERE buyer_id = ? AND status != 'cancelled'`,
      [userId]
    );
    const totalSpending = spendingRows[0].total_spent || 0;
    const [sellerRows] = await db.query(
      `SELECT seller_id AS id, name, total_sales FROM stores ORDER BY total_sales DESC LIMIT 1`
    );
    const topSeller = sellerRows[0] || null;
    const [products] = await db.query(
      `SELECT id, name, category, price FROM products WHERE is_active = 1`
    );

    let chartAverages = [0, 0, 0, 0, 0, 0, 0];
    let processedProducts = [];
    function linearRegressionForecast(prices, daysAhead = 7) {
      const n = prices.length;
      const xs = prices.map((_, i) => i);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = prices.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((sum, x, i) => sum + x * prices[i], 0);
      const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);
      const denominator = (n * sumX2 - sumX * sumX);
      const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;
      const predictedPrice = slope * (n - 1 + daysAhead) + intercept;
      const meanY = sumY / n;
      const ssTot = prices.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
      const ssRes = prices.reduce((sum, y, i) => sum + Math.pow(y - (slope * xs[i] + intercept), 2), 0);
      const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
      let confidence = 'low';
      if (r2 >= 0.7) confidence = 'high';
      else if (r2 >= 0.4) confidence = 'moderate';
      return { predictedPrice, r2, confidence };
    }
    for (let p of products) {
      const [historyRows] = await db.query(
        `SELECT price, recorded_at FROM price_history WHERE product_id = ? ORDER BY recorded_at ASC LIMIT 30`,
        [p.id]
      );
      const histPrices = historyRows.map(h => Number(h.price));
      const currentPrice = p.price;
      let isSmartPricing = false;
      let smartDesc = "";
      let message = "Prices are currently stable.";
      let predictedPercentage = 0;
      let confidence = 'insufficient';
      if (histPrices.length >= 3) {
        const { predictedPrice, confidence: conf } = linearRegressionForecast(histPrices, 7);
        confidence = conf;
        predictedPercentage = currentPrice === 0 ? 0 : ((predictedPrice - currentPrice) / currentPrice) * 100;

        if (Math.abs(predictedPercentage) > 1.5) {
          isSmartPricing = true;
          const direction = predictedPercentage > 0 ? 'rise' : 'decrease';
          smartDesc = `Forecast (${conf} confidence): Price expected to ${direction} by ${Math.abs(predictedPercentage).toFixed(1)}% in the next 7 days, based on ${histPrices.length} historical data points.`;
          message = predictedPercentage > 0
            ? "Price surge detected, Consider buying now to avoid paying more!"
            : "Good time to stock up and save money!";
        }
      } else {
        smartDesc = `Not enough price history yet (${histPrices.length} data point${histPrices.length === 1 ? '' : 's'}) to forecast reliably.`;
      }
      const previousPrice = histPrices.length >= 2 ? histPrices[histPrices.length - 2] : currentPrice;
      const diff = currentPrice - previousPrice;
      const percentage = previousPrice === 0 ? 0 : (diff / previousPrice) * 100;
      const isUp = percentage > 0;
      const isDown = percentage < 0;
      processedProducts.push({
          id: p.id,
          name: p.name,
          category: p.category,
          currentPrice,
          previousPrice,
          history: histPrices,
          isSmartPricing,
          smartDesc,
          message,
          confidence,
          predictedChangePercent: Number(predictedPercentage.toFixed(2)),
          trend: {
              isUp,
              isDown,
              formatted: (isUp ? '+' : '') + percentage.toFixed(2) + '%'
          }
      });
      const last7 = histPrices.slice(-7);
      for (let day = 0; day < 7; day++) {
          chartAverages[day] += last7[day] !== undefined ? last7[day] : currentPrice;
      }
    }

    if (products.length > 0) {
        for (let day = 0; day < 7; day++) {
            chartAverages[day] = chartAverages[day] / products.length;
        }
    }

    return successResponse(res, 'Insights successfully loaded.', {
      totalSpending,
      topSeller,
      chartAverages,
      products: processedProducts
    });

  } catch (err) {
    console.error('getDashboardInsights error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

module.exports = { getDashboardInsights };
