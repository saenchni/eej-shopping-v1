const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();
const { generateShopeeSignature, generateShopeeAuthUrl, parseShopeeResponse } = require('../utils/shopeeUtils');
const { saveShopeeToken, getShopeeToken, saveAIAnalytics, getAIAnalytics } = require('../utils/firebaseUtils');

const SHOPEE_API_BASE = 'https://partner.shopeemobile.com/api/v2';
const SHOPEE_PARTNER_ID = process.env.SHOPEE_PARTNER_ID;
const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY;
const SHOPEE_REDIRECT_URL = process.env.SHOPEE_REDIRECT_URL;

/**
 * GET /api/shopee/auth-url
 * Generate Shopee OAuth authorization URL
 */
router.get('/auth-url', (req, res) => {
  try {
    const authUrl = generateShopeeAuthUrl(SHOPEE_PARTNER_ID, SHOPEE_REDIRECT_URL);
    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to authorize',
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/shopee/callback
 * Handle OAuth callback and exchange code for access token
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided',
      });
    }

    // Exchange code for access token
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ code });
    const path = '/api/v2/oauth/token';
    const signature = generateShopeeSignature(path, SHOPEE_PARTNER_KEY, body);

    const response = await axios.post(`${SHOPEE_API_BASE}${path}`, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${SHOPEE_PARTNER_ID}:${signature}`,
        'X-Shopee-Timestamp': timestamp,
      },
    });

    const tokenData = parseShopeeResponse(response);
    const shopId = tokenData.shop_id;

    // Save token to Firestore
    await saveShopeeToken(shopId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expire_in,
    });

    // Return success response
    res.json({
      success: true,
      message: 'Token saved successfully',
      shopId,
      redirectUrl: `https://your-frontend.com/dashboard?shopId=${shopId}`,
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/shopee/ai-insights/:shopId
 * Process AI Analytics - summarize sales from orders
 */
router.get('/ai-insights/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    // Get stored token
    const tokenData = await getShopeeToken(shopId);
    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Shop token not found. Please authorize first.',
      });
    }

    // Fetch orders from Shopee API
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/order/orders_list';
    const signature = generateShopeeSignature(path, SHOPEE_PARTNER_KEY);

    const ordersResponse = await axios.get(`${SHOPEE_API_BASE}${path}`, {
      params: {
        shop_id: shopId,
        cursor: 0,
        page_size: 100,
      },
      headers: {
        'Authorization': `${SHOPEE_PARTNER_ID}:${signature}`,
        'X-Shopee-Timestamp': timestamp,
        'X-Shopee-Access-Token': tokenData.accessToken,
      },
    });

    const orders = parseShopeeResponse(ordersResponse).orders || [];

    // Process AI Analytics
    const analytics = processAIAnalytics(orders, shopId);

    // Save to Firestore
    await saveAIAnalytics(shopId, analytics);

    res.json({
      success: true,
      message: 'AI Insights generated successfully',
      data: analytics,
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Process orders data and generate AI insights
 * @param {array} orders - Orders from Shopee API
 * @param {string} shopId - Shop ID
 * @returns {object} Processed analytics
 */
function processAIAnalytics(orders, shopId) {
  const totalOrders = orders.length;
  let totalRevenue = 0;
  const productSales = {};
  const hourlyTrend = Array(24).fill(0);

  orders.forEach((order) => {
    // Calculate revenue
    const itemPrice = order.total_amount || 0;
    totalRevenue += itemPrice;

    // Track product sales
    if (order.items) {
      order.items.forEach((item) => {
        const productName = item.item_name || 'Unknown';
        productSales[productName] = (productSales[productName] || 0) + item.quantity;
      });
    }

    // Track hourly trend
    if (order.create_time) {
      const hour = new Date(order.create_time * 1000).getHours();
      hourlyTrend[hour]++;
    }
  });

  const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, qty]) => ({ name, quantity: qty }));

  const insights = generateInsights(totalOrders, totalRevenue, topProducts, hourlyTrend);

  return {
    insights,
    totalOrders,
    totalRevenue: totalRevenue.toFixed(2),
    averageOrderValue,
    topProducts,
    hourlyTrend,
    recommendations: generateRecommendations(totalOrders, topProducts, averageOrderValue),
  };
}

/**
 * Generate AI insights text
 */
function generateInsights(totalOrders, totalRevenue, topProducts, hourlyTrend) {
  let insights = `📊 ยอดขายรวม: ${totalOrders} คำสั่งซื้อ\n`;
  insights += `💰 รายได้รวม: ฿${totalRevenue.toFixed(2)}\n`;
  
  if (topProducts.length > 0) {
    insights += `🏆 สินค้าขายดี: ${topProducts[0].name} (${topProducts[0].quantity} ชิ้น)\n`;
  }

  const peakHour = hourlyTrend.indexOf(Math.max(...hourlyTrend));
  insights += `⏰ เวลาการขายสูงสุด: ${peakHour}:00 น.`;

  return insights;
}

/**
 * Generate AI recommendations
 */
function generateRecommendations(totalOrders, topProducts, averageOrderValue) {
  const recommendations = [];

  if (totalOrders < 10) {
    recommendations.push('🎯 เพิ่มการโฆษณาสินค้าเพื่อเพิ่มยอดขาย');
  }

  if (topProducts.length > 0 && topProducts[0].quantity > totalOrders * 0.5) {
    recommendations.push('📦 เก็บสต็อกเพิ่มเติมของสินค้าขายดี');
  }

  if (averageOrderValue < 500) {
    recommendations.push('💳 ลองเพิ่มเซ็ตสินค้า (Bundle) เพื่อเพิ่มมูลค่าแต่ละออเดอร์');
  }

  recommendations.push('⭐ ขอรีวิวจากลูกค้าเพื่อเพิ่มความน่าเชื่อถือ');

  return recommendations;
}

module.exports = router;
