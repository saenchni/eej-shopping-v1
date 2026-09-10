const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Save Shopee OAuth token to Firestore
 * @param {string} shopId - Shop ID from Shopee
 * @param {object} tokenData - Token data { access_token, refresh_token, expires_in }
 * @returns {Promise<void>}
 */
const saveShopeeToken = async (shopId, tokenData) => {
  const tokenRef = db.collection('shopee_tokens').doc(shopId);
  await tokenRef.set(
    {
      shopId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );
};

/**
 * Get stored Shopee token from Firestore
 * @param {string} shopId - Shop ID
 * @returns {Promise<object|null>} Token data or null
 */
const getShopeeToken = async (shopId) => {
  const doc = await db.collection('shopee_tokens').doc(shopId).get();
  return doc.exists ? doc.data() : null;
};

/**
 * Save AI Analytics result to Firestore
 * @param {string} shopId - Shop ID
 * @param {object} analyticsData - Analytics insights
 * @returns {Promise<void>}
 */
const saveAIAnalytics = async (shopId, analyticsData) => {
  const analyticsRef = db.collection('ai_analytics').doc(shopId);
  await analyticsRef.set(
    {
      shopId,
      insights: analyticsData.insights,
      totalOrders: analyticsData.totalOrders,
      totalRevenue: analyticsData.totalRevenue,
      averageOrderValue: analyticsData.averageOrderValue,
      topProducts: analyticsData.topProducts,
      recommendations: analyticsData.recommendations,
      generatedAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );
};

/**
 * Get latest AI Analytics for shop
 * @param {string} shopId - Shop ID
 * @returns {Promise<object|null>} Analytics data or null
 */
const getAIAnalytics = async (shopId) => {
  const doc = await db.collection('ai_analytics').doc(shopId).get();
  return doc.exists ? doc.data() : null;
};

module.exports = {
  saveShopeeToken,
  getShopeeToken,
  saveAIAnalytics,
  getAIAnalytics,
};
