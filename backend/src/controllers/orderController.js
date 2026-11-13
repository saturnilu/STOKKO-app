const orderModel      = require('../models/orderModel');
const cartModel       = require('../models/cartModel');
const notifModel      = require('../models/notificationModel');
const db              = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { payment_method, payment_detail, notes } = req.body;
    const validMethods = ['qris', 'ewallet', 'card', 'va'];
    if (!payment_method || !validMethods.includes(payment_method)) {
      await conn.rollback();
      conn.release();
      return errorResponse(res, 'Invalid payment method.', 400);
    }

    const [cartRows] = await conn.query(
      `SELECT ci.*, p.name, p.price, p.stock, p.image_url, p.category, p.seller_id,
              s.name AS store_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN stores s ON p.seller_id = s.seller_id
       WHERE ci.buyer_id = ?`,
      [req.user.id]
    );

    if (!cartRows.length) {
      await conn.rollback();
      conn.release();
      return errorResponse(res, 'Your card is empty.', 400);
    }

    for (const item of cartRows) {
      const [rows] = await conn.query(
        'SELECT stock FROM products WHERE id = ? FOR UPDATE', [item.product_id]
      );
      if (!rows.length || rows[0].stock < item.quantity) {
        await conn.rollback();
        conn.release();
        return errorResponse(res, `Insufficient "${item.name}" stock. Remaining ${rows[0]?.stock || 0}.`, 400);
      }
    }

    const subtotal = cartRows.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax      = Math.round(subtotal * 0.1);
    const total    = subtotal + tax;
    const [orderResult] = await conn.query(
      `INSERT INTO orders (buyer_id, subtotal, tax, total, payment_method, payment_detail, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, subtotal, tax, total, payment_method, payment_detail || null, notes || null]
    );
    const orderId = orderResult.insertId;
    const orderItems = cartRows.map(item => [orderId, item.product_id, item.seller_id, item.quantity, item.price]);
    await conn.query(
      `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price) VALUES ?`,
      [orderItems]
    );

    for (const item of cartRows) {
      await conn.query(
        'UPDATE products SET stock = stock - ?, sales_count = sales_count + ? WHERE id = ?',
        [item.quantity, item.quantity, item.product_id]
      );
    }

    const sellerQtyMap = {};
    for (const item of cartRows) {
      sellerQtyMap[item.seller_id] = (sellerQtyMap[item.seller_id] || 0) + item.quantity;
    }
    for (const [sellerId, qty] of Object.entries(sellerQtyMap)) {
      await conn.query(
        'UPDATE stores SET total_sales = total_sales + ? WHERE seller_id = ?',
        [qty, sellerId]
      );
    }

    await conn.query('DELETE FROM cart_items WHERE buyer_id = ?', [req.user.id]);
    await conn.commit();
    await notifModel.create({
      userId:  req.user.id,
      type:    'order_update',
      title:   'Order Placed Successfully 🎉',
      message: `Order #${orderId} successfully created and awaiting seller confirmation.`,
      orderId,
    });

    const sellerIds = [...new Set(cartRows.map(i => i.seller_id))];
    for (const sellerId of sellerIds) {
      const sellerItems = cartRows.filter(i => i.seller_id === sellerId);
      const itemNames   = sellerItems.map(i => `${i.name} (x${i.quantity})`).join(', ');
      await notifModel.create({
        userId:  sellerId,
        type:    'new_order',
        title:   'New Order Received 📦',
        message: `You have a new order for: ${itemNames}. Order ID: #${orderId}`,
        orderId,
      });
    }
    return successResponse(res, 'Order successfully created.', { order_id: orderId }, 201);
  } catch (err) {
    await conn.rollback();
    console.error('createOrder error:', err);
    return errorResponse(res, 'Server error.', 500);
  } finally {
    conn.release();
  }
};

const getOrders = async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'buyer') {
      orders = await orderModel.getByBuyer(req.user.id);
    } else {
      orders = await orderModel.getBySeller(req.user.id);
    }
    return successResponse(res, 'OK', { orders });
  } catch (err) {
    console.error('getOrders error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderModel.getById(req.params.id);
    if (!order) return errorResponse(res, 'Order not found.', 404);
    return successResponse(res, 'OK', { order });
  } catch (err) {
    console.error('getOrderById error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Status invalid.', 400);
    }

    const updated = await orderModel.updateStatus(req.params.id, req.user.id, status);
    if (!updated) {
      return errorResponse(res, 'Order not found or it is not your product.', 404);
    }

    const order = await orderModel.getById(req.params.id);
    const statusMessages = {
      processing: 'Your order is being processed by the seller.',
      shipped:    'Your order is on its way! 🚚',
      delivered:  'Your order has arrived. Enjoy! 🎉',
      cancelled:  'Your order has been cancelled by the seller.',
    };

    if (statusMessages[status]) {
      await notifModel.create({
        userId:  order.buyer_id,
        type:    'order_update',
        title:   `Order Update: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: statusMessages[status],
        orderId: order.id,
      });
    }

    return successResponse(res, `Order status successfully updated to "${status}".`);
  } catch (err) {
    console.error('updateStatus error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

module.exports = { createOrder, getOrders, getOrderById, updateStatus };
