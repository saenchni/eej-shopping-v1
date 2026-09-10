const express = require('express');
const router = express.Router();
const SyncService = require('../services/syncService');
const { getShopeeToken } = require('../utils/firebaseUtils');

/**
 * POST /api/sync/products/:shopId
 * Sync products from Shopee
 */
router.post('/products/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const tokenData = await getShopeeToken(shopId);

    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Shop token not found',
      });
    }

    const result = await SyncService.syncProducts(shopId, tokenData);
    res.json({
      success: true,
      message: 'Products synced successfully',
      data: result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/orders/:shopId
 * Sync orders from Shopee
 */
router.post('/orders/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const tokenData = await getShopeeToken(shopId);

    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Shop token not found',
      });
    }

    const result = await SyncService.syncOrders(shopId, tokenData);
    res.json({
      success: true,
      message: 'Orders synced successfully',
      data: result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/all/:shopId
 * Sync all data (products + orders)
 */
router.post('/all/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const tokenData = await getShopeeToken(shopId);

    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: 'Shop token not found',
      });
    }

    const [productsResult, ordersResult] = await Promise.all([
      SyncService.syncProducts(shopId, tokenData),
      SyncService.syncOrders(shopId, tokenData),
    ]);

    res.json({
      success: true,
      message: 'All data synced successfully',
      data: {
        products: productsResult,
        orders: ordersResult,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
