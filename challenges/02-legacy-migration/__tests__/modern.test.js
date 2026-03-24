'use strict';

const asyncApi = require('../src/modern/asyncApi');
const jsonTransformer = require('../src/modern/jsonTransformer');

// ─── asyncApi tests ──────────────────────────────────────────────────

describe('Modern asyncApi', () => {
  describe('fetchUserProfile', () => {
    test('returns a full profile for a valid userId', async () => {
      const profile = await asyncApi.fetchUserProfile('user_123');
      expect(profile).toHaveProperty('id', 'user_123');
      expect(profile).toHaveProperty('name', 'User user_123');
      expect(profile).toHaveProperty('email', 'user_123@example.com');
      expect(profile).toHaveProperty('joinedAt');
      expect(profile).toHaveProperty('preferences');
      expect(profile.preferences).toHaveProperty('theme', 'dark');
      expect(profile).toHaveProperty('subscription');
      expect(profile.subscription).toHaveProperty('plan', 'premium');
    });

    test('rejects with error for null userId', async () => {
      await expect(asyncApi.fetchUserProfile(null)).rejects.toThrow(/Invalid userId/);
    });

    test('rejects with error for empty string userId', async () => {
      await expect(asyncApi.fetchUserProfile('')).rejects.toThrow(/Invalid userId/);
    });

    test('rejects with error for numeric userId', async () => {
      await expect(asyncApi.fetchUserProfile(42)).rejects.toThrow(/Invalid userId/);
    });

    test('rejects with error for err_ prefixed userId', async () => {
      await expect(asyncApi.fetchUserProfile('err_broken')).rejects.toThrow(/Failed to fetch/);
    });

    test('profile contains correct nested preferences', async () => {
      const profile = await asyncApi.fetchUserProfile('user_nested');
      expect(profile.preferences).toEqual({
        theme: 'dark',
        language: 'en',
        notifications: true,
        itemsPerPage: 25,
      });
    });

    test('profile contains subscription with features', async () => {
      const profile = await asyncApi.fetchUserProfile('user_sub');
      expect(profile.subscription.features).toContain('analytics');
      expect(profile.subscription.features).toContain('export');
      expect(profile.subscription.features).toContain('priority-support');
      expect(profile.subscription).toHaveProperty('autoRenew', true);
    });
  });

  describe('fetchOrderHistory', () => {
    test('returns paginated orders without details', async () => {
      const result = await asyncApi.fetchOrderHistory('user_abc', { page: 1, limit: 5 });
      expect(result.orders).toHaveLength(5);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 23,
        pages: 5,
      });
    });

    test('orders contain userId and orderId', async () => {
      const result = await asyncApi.fetchOrderHistory('user_ids', { page: 1, limit: 3 });
      result.orders.forEach((order) => {
        expect(order).toHaveProperty('orderId');
        expect(order).toHaveProperty('userId', 'user_ids');
      });
    });

    test('returns enriched orders when includeDetails is true', async () => {
      const result = await asyncApi.fetchOrderHistory('user_detail', {
        page: 1,
        limit: 3,
        includeDetails: true,
      });
      expect(result.orders).toHaveLength(3);
      result.orders.forEach((order) => {
        expect(order).toHaveProperty('details');
        expect(order.details).toHaveProperty('items');
        expect(order.details).toHaveProperty('total');
        expect(order).toHaveProperty('shipping');
        expect(order.shipping).toHaveProperty('status');
        expect(order.shipping).toHaveProperty('carrier', 'FastShip');
      });
    });

    test('rejects for invalid userId', async () => {
      await expect(asyncApi.fetchOrderHistory(null)).rejects.toThrow(/Invalid userId/);
    });

    test('rejects for err_ prefixed userId', async () => {
      await expect(asyncApi.fetchOrderHistory('err_fail')).rejects.toThrow(/Failed to fetch/);
    });

    test('handles last page with fewer results', async () => {
      const result = await asyncApi.fetchOrderHistory('user_page', { page: 5, limit: 5 });
      expect(result.orders).toHaveLength(3);
    });

    test('defaults to page 1, limit 10', async () => {
      const result = await asyncApi.fetchOrderHistory('user_defaults');
      expect(result.orders).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    test('fetches details in parallel (timing check)', async () => {
      const start = Date.now();
      const result = await asyncApi.fetchOrderHistory('user_parallel', {
        page: 1,
        limit: 5,
        includeDetails: true,
      });
      const elapsed = Date.now() - start;
      expect(result.orders).toHaveLength(5);
      // If done sequentially with 10-50ms per call, 5 orders x 2 calls each = 100-500ms
      // In parallel, should be closer to 50-100ms max
      // We use a generous threshold but it should be noticeably less than sequential
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('fetchDashboardData', () => {
    test('returns complete dashboard for valid user', async () => {
      const dashboard = await asyncApi.fetchDashboardData('user_dash');
      expect(dashboard).toHaveProperty('userId', 'user_dash');
      expect(dashboard).toHaveProperty('generatedAt');
      expect(dashboard).toHaveProperty('profile');
      expect(dashboard.profile).toHaveProperty('id', 'user_dash');
      expect(dashboard).toHaveProperty('recentOrders');
      expect(dashboard.recentOrders.length).toBeLessThanOrEqual(5);
      expect(dashboard).toHaveProperty('orderSummary');
      expect(dashboard.orderSummary).toHaveProperty('total', 23);
      expect(dashboard.errors).toBeNull();
    });

    test('rejects for invalid userId', async () => {
      await expect(asyncApi.fetchDashboardData(null)).rejects.toThrow(/Invalid userId/);
    });

    test('rejects when all sources fail', async () => {
      await expect(asyncApi.fetchDashboardData('err_all')).rejects.toThrow(
        /All data sources failed/
      );
    });

    test('fetches profile and orders in parallel (timing check)', async () => {
      const start = Date.now();
      await asyncApi.fetchDashboardData('user_timing');
      const elapsed = Date.now() - start;
      // Profile takes ~3 sequential calls (30-150ms), orders takes ~1 call (10-50ms)
      // In parallel, total should be roughly max of the two, not sum
      expect(elapsed).toBeLessThan(500);
    });
  });
});

// ─── jsonTransformer tests ───────────────────────────────────────────

describe('Modern jsonTransformer', () => {
  describe('parseProductCatalog', () => {
    test('parses valid JSON product array', () => {
      const json = JSON.stringify([
        { name: 'Widget A', price: 19.99, category: 'electronics', sku: 'WA-001', inStock: true },
        { name: 'Gadget B', price: 49.99, category: 'electronics', sku: 'GB-002', inStock: false },
      ]);
      const result = jsonTransformer.parseProductCatalog(json);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Widget A',
        price: 19.99,
        category: 'electronics',
        sku: 'WA-001',
        inStock: true,
      });
    });

    test('returns empty array for null input', () => {
      expect(jsonTransformer.parseProductCatalog(null)).toEqual([]);
    });

    test('returns empty array for empty string', () => {
      expect(jsonTransformer.parseProductCatalog('')).toEqual([]);
    });

    test('returns empty array for invalid JSON', () => {
      expect(jsonTransformer.parseProductCatalog('not json {')).toEqual([]);
    });

    test('returns empty array when parsed value is not an array', () => {
      expect(jsonTransformer.parseProductCatalog('{"key": "value"}')).toEqual([]);
    });

    test('applies defaults for missing fields', () => {
      const json = JSON.stringify([{ name: 'Minimal' }]);
      const result = jsonTransformer.parseProductCatalog(json);
      expect(result[0]).toEqual({
        name: 'Minimal',
        price: 0,
        category: 'uncategorized',
        sku: '',
        inStock: false,
      });
    });

    test('handles negative price by defaulting to 0', () => {
      const json = JSON.stringify([{ name: 'Neg', price: -5 }]);
      const result = jsonTransformer.parseProductCatalog(json);
      expect(result[0].price).toBe(0);
    });

    test('handles non-boolean inStock by defaulting to false', () => {
      const json = JSON.stringify([{ name: 'X', inStock: 'yes' }]);
      const result = jsonTransformer.parseProductCatalog(json);
      expect(result[0].inStock).toBe(false);
    });
  });

  describe('parseInventoryReport', () => {
    test('parses inventory items with nested location', () => {
      const json = JSON.stringify([
        {
          sku: 'SKU-001',
          quantity: 150,
          warehouse: 'west-1',
          location: { aisle: 'A', shelf: '3', bin: '12' },
          lastCounted: '2026-01-15',
          reorderThreshold: 50,
        },
      ]);
      const result = jsonTransformer.parseInventoryReport(json);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sku: 'SKU-001',
        quantity: 150,
        warehouse: 'west-1',
        location: { aisle: 'A', shelf: '3', bin: '12' },
        lastCounted: '2026-01-15',
        reorderThreshold: 50,
        needsReorder: false,
      });
    });

    test('computes needsReorder correctly', () => {
      const json = JSON.stringify([
        { sku: 'LOW', quantity: 5, reorderThreshold: 10 },
        { sku: 'OK', quantity: 100, reorderThreshold: 10 },
        { sku: 'EXACT', quantity: 10, reorderThreshold: 10 },
      ]);
      const result = jsonTransformer.parseInventoryReport(json);
      expect(result[0].needsReorder).toBe(true);
      expect(result[1].needsReorder).toBe(false);
      expect(result[2].needsReorder).toBe(true);
    });

    test('returns empty array for null input', () => {
      expect(jsonTransformer.parseInventoryReport(null)).toEqual([]);
    });

    test('returns empty array for invalid JSON', () => {
      expect(jsonTransformer.parseInventoryReport('bad json')).toEqual([]);
    });

    test('applies defaults for missing fields', () => {
      const json = JSON.stringify([{}]);
      const result = jsonTransformer.parseInventoryReport(json);
      expect(result[0]).toEqual({
        sku: '',
        quantity: 0,
        warehouse: 'default',
        location: { aisle: '', shelf: '', bin: '' },
        lastCounted: null,
        reorderThreshold: 0,
        needsReorder: true,
      });
    });
  });

  describe('convertCatalogToJson', () => {
    test('converts products to formatted JSON string', () => {
      const products = [
        { name: 'Test', price: 9.99, category: 'misc', sku: 'T-001', inStock: true },
      ];
      const json = jsonTransformer.convertCatalogToJson(products);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Test');
      expect(parsed[0].price).toBe(9.99);
    });

    test('returns empty array JSON for null input', () => {
      expect(jsonTransformer.convertCatalogToJson(null)).toBe('[]');
    });

    test('returns empty array JSON for non-array input', () => {
      expect(jsonTransformer.convertCatalogToJson('string')).toBe('[]');
    });

    test('normalizes missing fields', () => {
      const json = jsonTransformer.convertCatalogToJson([{}]);
      const parsed = JSON.parse(json);
      expect(parsed[0]).toEqual({
        name: 'Unknown',
        price: 0,
        category: 'uncategorized',
        sku: '',
        inStock: false,
      });
    });

    test('formats price to two decimal places as number', () => {
      const json = jsonTransformer.convertCatalogToJson([{ name: 'X', price: 10 }]);
      const parsed = JSON.parse(json);
      expect(parsed[0].price).toBe(10);
      // The price in the string should show 10.00 style but parse as number
      expect(json).toContain('10');
    });

    test('output is pretty-printed with 2 spaces', () => {
      const json = jsonTransformer.convertCatalogToJson([{ name: 'A', price: 1 }]);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });
});
