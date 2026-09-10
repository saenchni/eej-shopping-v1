const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

const db = admin.firestore();
const SHOPEE_API_BASE = 'https://partner.shopeemobile.com/api/v2';

/**
 * Sync service to fetch and update shop data from Shopee
 */
class SyncService {
  /**
   * Sync products for a shop
   * @param {string} shopId - Shop ID
   * @param {object} tokenData - Token data from Firestore
   */
  async syncProducts(shopId, tokenData) {
    const logRef = db.collection('sync_logs').doc();
    const startTime = new Date();

    try {
      console.log(`📦 Syncing products for shop ${shopId}...`);

      // Fetch products from Shopee API
      const products = await this.fetchShopeeProducts(shopId, tokenData);
      const batch = db.batch();
      let processedCount = 0;

      for (const product of products) {
        const productRef = db.collection('shop_data').doc(shopId)
          .collection('products').doc(product.item_id);
        batch.set(productRef, {
          productId: product.item_id,
          name: product.item_name,
          description: product.description || '',
          price: product.price / 100000, // Convert from smallest unit
          originalPrice: product.original_price / 100000,
          stock: product.quantity,
          sold: product.sold,
          image: product.image?.image_url || '',
          rating: product.rating_star || 0,
          updatedAt: new Date(),
        });
        processedCount++;
      }

      await batch.commit();

      // Log success
      await logRef.set({
        shopId,
        syncType: 'products',
        status: 'success',
        startTime,
        endTime: new Date(),
        recordsProcessed: processedCount,
        createdAt: new Date(),
      });

      console.log(`✅ Synced ${processedCount} products`);
      return { success: true, recordsProcessed: processedCount };
    } catch (error) {
      console.error('❌ Error syncing products:', error);
      await logRef.set({
        shopId,
        syncType: 'products',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error.message,
        createdAt: new Date(),
      });
      throw error;
    }
  }

  /**
   * Sync orders for a shop
   * @param {string} shopId - Shop ID
   * @param {object} tokenData - Token data from Firestore
   */
  async syncOrders(shopId, tokenData) {
    const logRef = db.collection('sync_logs').doc();
    const startTime = new Date();

    try {
      console.log(`📋 Syncing orders for shop ${shopId}...`);

      // Fetch orders from Shopee API
      const orders = await this.fetchShopeeOrders(shopId, tokenData);
      const batch = db.batch();
      let processedCount = 0;

      for (const order of orders) {
        const orderRef = db.collection('shop_data').doc(shopId)
          .collection('orders').doc(order.order_sn);
        batch.set(orderRef, {
          orderId: order.order_sn,
          buyerName: order.buyer_user_id || 'Unknown',
          amount: order.total_amount / 100000,
          itemCount: order.items_count || 0,
          status: this.mapOrderStatus(order.order_status),
          items: order.items || [],
          orderDate: new Date(order.create_time * 1000),
          updatedAt: new Date(),
        });
        processedCount++;
      }

      await batch.commit();

      await logRef.set({
        shopId,
        syncType: 'orders',
        status: 'success',
        startTime,
        endTime: new Date(),
        recordsProcessed: processedCount,
        createdAt: new Date(),
      });

      console.log(`✅ Synced ${processedCount} orders`);
      return { success: true, recordsProcessed: processedCount };
    } catch (error) {
      console.error('❌ Error syncing orders:', error);
      await logRef.set({
        shopId,
        syncType: 'orders',
        status: 'failed',
        startTime,
        endTime: new Date(),
        error: error.message,
        createdAt: new Date(),
      });
      throw error;
    }
  }

  /**
   * Fetch products from Shopee API
   */
  async fetchShopeeProducts(shopId, tokenData) {
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      const response = await axios.get(`${SHOPEE_API_BASE}/product/get_shop_products`, {
        params: {
          shop_id: shopId,
          pagination_entries_per_page: 100,
          cursor: 0,
        },
        headers: {
          'Authorization': `${process.env.SHOPEE_PARTNER_ID}:signature`,
          'X-Shopee-Timestamp': timestamp,
          'X-Shopee-Access-Token': tokenData.accessToken,
        },
      });
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching from Shopee API:', error.message);
      throw error;
    }
  }

  /**
   * Fetch orders from Shopee API
   */
  async fetchShopeeOrders(shopId, tokenData) {
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      const response = await axios.get(`${SHOPEE_API_BASE}/order/orders_list`, {
        params: {
          shop_id: shopId,
          page_size: 100,
          cursor: 0,
        },
        headers: {
          'Authorization': `${process.env.SHOPEE_PARTNER_ID}:signature`,
          'X-Shopee-Timestamp': timestamp,
          'X-Shopee-Access-Token': tokenData.accessToken,
        },
      });
      return response.data.orders || [];
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      throw error;
    }
  }

  /**
   * Map Shopee order status to app status
   */
  mapOrderStatus(shopeeStatus) {
    const statusMap = {
      0: 'pending',
      1: 'pending',
      2: 'shipped',
      3: 'delivered',
      4: 'cancelled',
      5: 'returned',
    };
    return statusMap[shopeeStatus] || 'pending';
  }
}

module.exports = new SyncService();
