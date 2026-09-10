# Firestore Database Schema

## Collections Structure

### 1. shopee_tokens
```
Collection: shopee_tokens
Document ID: {shopId}
├── shopId (string) - Shop ID from Shopee
├── accessToken (string) - OAuth access token
├── refreshToken (string) - OAuth refresh token
├── expiresIn (number) - Token expiration time in seconds
├── expiresAt (timestamp) - When token expires
├── createdAt (timestamp) - When token was created
└── updatedAt (timestamp) - Last update time
```

### 2. shop_data
```
Collection: shop_data
Document ID: {shopId}
├── shopId (string)
├── shopName (string)
├── shopLogo (string) - Shop logo URL
├── totalRevenue (number)
├── totalOrders (number)
├── productCount (number)
├── rating (number)
├── followers (number)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

### 3. products
```
Collection: shop_data/{shopId}/products
Document ID: {productId}
├── productId (string)
├── name (string)
├── description (string)
├── price (number)
├── originalPrice (number)
├── stock (number)
├── sold (number)
├── category (string)
├── image (string)
├── rating (number)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

### 4. orders
```
Collection: shop_data/{shopId}/orders
Document ID: {orderId}
├── orderId (string)
├── buyerName (string)
├── buyerPhone (string)
├── amount (number)
├── itemCount (number)
├── status (string) - pending, shipped, delivered, cancelled
├── items (array)
│   └── items[]
│       ├── itemId (string)
│       ├── name (string)
│       ├── quantity (number)
│       └── price (number)
├── shippingAddress (object)
│   ├── address (string)
│   ├── city (string)
│   ├── district (string)
│   └── province (string)
├── orderDate (timestamp)
├── shippedDate (timestamp)
├── deliveredDate (timestamp)
└── createdAt (timestamp)
```

### 5. ai_analytics
```
Collection: ai_analytics
Document ID: {shopId}
├── shopId (string)
├── insights (string) - AI generated insights
├── totalOrders (number)
├── totalRevenue (number)
├── averageOrderValue (number)
├── topProducts (array)
│   └── topProducts[]
│       ├── name (string)
│       └── quantity (number)
├── hourlyTrend (array) - Sales per hour [0-23]
├── recommendations (array) - AI suggestions
├── generatedAt (timestamp)
└── updatedAt (timestamp)
```

### 6. users
```
Collection: users
Document ID: {userId}
├── userId (string)
├── email (string)
├── displayName (string)
├── avatar (string)
├── role (string) - admin, seller, viewer
├── shops (array) - Shop IDs this user owns/manages
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

### 7. sync_logs
```
Collection: sync_logs
Document ID: auto-generated
├── shopId (string)
├── syncType (string) - products, orders, analytics
├── status (string) - success, failed, pending
├── startTime (timestamp)
├── endTime (timestamp)
├── recordsProcessed (number)
├── error (string) - If failed
└── createdAt (timestamp)
```

## Indexes Required

```
Collection: shop_data
- Fields: shopId, updatedAt (descending)

Collection: shop_data/{shopId}/orders
- Fields: status, orderDate (descending)
- Fields: buyerName, orderDate (descending)

Collection: sync_logs
- Fields: shopId, createdAt (descending)
```
