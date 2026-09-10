const crypto = require('crypto');

/**
 * Generate Shopee API signature
 * @param {string} path - API endpoint path
 * @param {string} partnerKey - Shopee partner key
 * @param {string} body - Request body (stringified JSON)
 * @returns {string} Generated signature
 */
const generateShopeeSignature = (path, partnerKey, body = '') => {
  const message = path + '|' + body;
  return crypto
    .createHmac('sha256', partnerKey)
    .update(message)
    .digest('hex');
};

/**
 * Generate Auth URL for Shopee OAuth
 * @param {string} partnerId - Shopee Partner ID
 * @param {string} redirectUrl - Redirect URL after auth
 * @returns {string} OAuth authorization URL
 */
const generateShopeeAuthUrl = (partnerId, redirectUrl) => {
  const baseUrl = 'https://partner.shopeemobile.com/api/v2/oauth/authorize';
  const params = new URLSearchParams({
    client_id: partnerId,
    redirect_uri: redirectUrl,
    response_type: 'code',
    state: crypto.randomBytes(16).toString('hex'),
  });
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Parse Shopee API response
 * @param {object} response - Axios response object
 * @returns {object} Parsed response data
 */
const parseShopeeResponse = (response) => {
  if (response.data.error) {
    throw new Error(`Shopee API Error: ${response.data.error_description}`);
  }
  return response.data;
};

module.exports = {
  generateShopeeSignature,
  generateShopeeAuthUrl,
  parseShopeeResponse,
};
