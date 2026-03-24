'use strict';

var SIMULATED_LATENCY_MIN = 10;
var SIMULATED_LATENCY_MAX = 50;

function randomLatency() {
  return Math.floor(
    Math.random() * (SIMULATED_LATENCY_MAX - SIMULATED_LATENCY_MIN) + SIMULATED_LATENCY_MIN
  );
}

function shouldSimulateError(userId) {
  return typeof userId === 'string' && userId.indexOf('err_') === 0;
}

function fetchUserPreferences(userId, callback) {
  setTimeout(function () {
    if (shouldSimulateError(userId)) {
      return callback(new Error('Failed to fetch preferences for user: ' + userId));
    }
    callback(null, {
      theme: 'dark',
      language: 'en',
      notifications: true,
      itemsPerPage: 25
    });
  }, randomLatency());
}

function fetchUserSubscription(userId, callback) {
  setTimeout(function () {
    if (shouldSimulateError(userId)) {
      return callback(new Error('Failed to fetch subscription for user: ' + userId));
    }
    callback(null, {
      plan: 'premium',
      expiresAt: '2026-12-31T23:59:59Z',
      autoRenew: true,
      features: ['analytics', 'export', 'priority-support']
    });
  }, randomLatency());
}

function fetchUserProfile(userId, callback) {
  if (!userId || typeof userId !== 'string') {
    return setTimeout(function () {
      callback(new Error('Invalid userId: must be a non-empty string'));
    }, 0);
  }

  setTimeout(function () {
    if (shouldSimulateError(userId)) {
      return callback(new Error('Failed to fetch profile for user: ' + userId));
    }

    var baseProfile = {
      id: userId,
      name: 'User ' + userId,
      email: userId + '@example.com',
      joinedAt: '2023-06-15T10:30:00Z'
    };

    fetchUserPreferences(userId, function (prefErr, preferences) {
      if (prefErr) {
        return callback(prefErr);
      }

      fetchUserSubscription(userId, function (subErr, subscription) {
        if (subErr) {
          return callback(subErr);
        }

        var fullProfile = {
          id: baseProfile.id,
          name: baseProfile.name,
          email: baseProfile.email,
          joinedAt: baseProfile.joinedAt,
          preferences: preferences,
          subscription: subscription
        };

        callback(null, fullProfile);
      });
    });
  }, randomLatency());
}

function fetchOrderDetails(orderId, callback) {
  setTimeout(function () {
    callback(null, {
      orderId: orderId,
      items: [
        { productId: 'prod_' + orderId + '_1', quantity: 2, price: 29.99 },
        { productId: 'prod_' + orderId + '_2', quantity: 1, price: 49.99 }
      ],
      subtotal: 109.97,
      tax: 9.90,
      total: 119.87
    });
  }, randomLatency());
}

function fetchShippingStatus(orderId, callback) {
  setTimeout(function () {
    var statuses = ['processing', 'shipped', 'in_transit', 'delivered'];
    var statusIndex = Math.abs(orderId.split('').reduce(function (acc, ch) {
      return acc + ch.charCodeAt(0);
    }, 0)) % statuses.length;

    callback(null, {
      orderId: orderId,
      status: statuses[statusIndex],
      carrier: 'FastShip',
      trackingNumber: 'FS' + orderId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
      estimatedDelivery: '2026-04-15T18:00:00Z'
    });
  }, randomLatency());
}

function fetchOrderHistory(userId, options, callback) {
  if (!userId || typeof userId !== 'string') {
    return setTimeout(function () {
      callback(new Error('Invalid userId: must be a non-empty string'));
    }, 0);
  }

  if (shouldSimulateError(userId)) {
    return setTimeout(function () {
      callback(new Error('Failed to fetch order history for user: ' + userId));
    }, randomLatency());
  }

  var page = (options && options.page) || 1;
  var limit = (options && options.limit) || 10;
  var includeDetails = (options && options.includeDetails) || false;

  setTimeout(function () {
    var totalOrders = 23;
    var startIndex = (page - 1) * limit;
    var orderIds = [];
    for (var i = startIndex; i < Math.min(startIndex + limit, totalOrders); i++) {
      orderIds.push('order_' + userId + '_' + (i + 1));
    }

    if (!includeDetails) {
      var simpleOrders = orderIds.map(function (id) {
        return { orderId: id, userId: userId, createdAt: '2026-01-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0') };
      });
      return callback(null, {
        orders: simpleOrders,
        pagination: { page: page, limit: limit, total: totalOrders, pages: Math.ceil(totalOrders / limit) }
      });
    }

    var enrichedOrders = [];
    var processedCount = 0;
    var hasErrored = false;

    if (orderIds.length === 0) {
      return callback(null, {
        orders: [],
        pagination: { page: page, limit: limit, total: totalOrders, pages: Math.ceil(totalOrders / limit) }
      });
    }

    for (var idx = 0; idx < orderIds.length; idx++) {
      (function (currentIdx) {
        var currentOrderId = orderIds[currentIdx];

        fetchOrderDetails(currentOrderId, function (detailErr, details) {
          if (hasErrored) return;
          if (detailErr) {
            hasErrored = true;
            return callback(detailErr);
          }

          fetchShippingStatus(currentOrderId, function (shipErr, shipping) {
            if (hasErrored) return;
            if (shipErr) {
              hasErrored = true;
              return callback(shipErr);
            }

            enrichedOrders[currentIdx] = {
              orderId: currentOrderId,
              userId: userId,
              details: details,
              shipping: shipping
            };

            processedCount++;
            if (processedCount === orderIds.length) {
              callback(null, {
                orders: enrichedOrders,
                pagination: { page: page, limit: limit, total: totalOrders, pages: Math.ceil(totalOrders / limit) }
              });
            }
          });
        });
      })(idx);
    }
  }, randomLatency());
}

function fetchDashboardData(userId, callback) {
  if (!userId || typeof userId !== 'string') {
    return setTimeout(function () {
      callback(new Error('Invalid userId: must be a non-empty string'));
    }, 0);
  }

  var completedSources = 0;
  var totalSources = 2;
  var results = {};
  var errors = [];

  fetchUserProfile(userId, function (profileErr, profile) {
    if (profileErr) {
      errors.push({ source: 'profile', error: profileErr.message });
    } else {
      results.profile = profile;
    }

    completedSources++;
    if (completedSources === totalSources) {
      finalizeDashboard();
    }
  });

  fetchOrderHistory(userId, { page: 1, limit: 5, includeDetails: false }, function (ordersErr, orderData) {
    if (ordersErr) {
      errors.push({ source: 'orders', error: ordersErr.message });
    } else {
      results.recentOrders = orderData.orders;
      results.orderSummary = {
        total: orderData.pagination.total,
        pages: orderData.pagination.pages
      };
    }

    completedSources++;
    if (completedSources === totalSources) {
      finalizeDashboard();
    }
  });

  function finalizeDashboard() {
    if (errors.length === totalSources) {
      return callback(new Error('All data sources failed: ' + JSON.stringify(errors)));
    }

    var dashboard = {
      userId: userId,
      generatedAt: new Date().toISOString(),
      profile: results.profile || null,
      recentOrders: results.recentOrders || [],
      orderSummary: results.orderSummary || { total: 0, pages: 0 },
      errors: errors.length > 0 ? errors : null
    };

    callback(null, dashboard);
  }
}

module.exports = {
  fetchUserProfile: fetchUserProfile,
  fetchOrderHistory: fetchOrderHistory,
  fetchDashboardData: fetchDashboardData
};
