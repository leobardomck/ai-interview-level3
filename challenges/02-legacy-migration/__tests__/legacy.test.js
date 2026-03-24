'use strict';

const callbackApi = require('../src/legacy/callbackApi');
const xmlParser = require('../src/legacy/xmlParser');

// ─── callbackApi tests ───────────────────────────────────────────────

describe('Legacy callbackApi', () => {
  describe('fetchUserProfile', () => {
    test('returns a full profile for a valid userId', (done) => {
      callbackApi.fetchUserProfile('user_123', (err, profile) => {
        expect(err).toBeNull();
        expect(profile).toHaveProperty('id', 'user_123');
        expect(profile).toHaveProperty('name', 'User user_123');
        expect(profile).toHaveProperty('email', 'user_123@example.com');
        expect(profile).toHaveProperty('joinedAt');
        expect(profile).toHaveProperty('preferences');
        expect(profile.preferences).toHaveProperty('theme', 'dark');
        expect(profile).toHaveProperty('subscription');
        expect(profile.subscription).toHaveProperty('plan', 'premium');
        done();
      });
    });

    test('returns error for null userId', (done) => {
      callbackApi.fetchUserProfile(null, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Invalid userId/);
        done();
      });
    });

    test('returns error for empty string userId', (done) => {
      callbackApi.fetchUserProfile('', (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Invalid userId/);
        done();
      });
    });

    test('returns error for numeric userId', (done) => {
      callbackApi.fetchUserProfile(42, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Invalid userId/);
        done();
      });
    });

    test('returns error for err_ prefixed userId', (done) => {
      callbackApi.fetchUserProfile('err_broken', (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Failed to fetch/);
        done();
      });
    });

    test('profile contains nested preferences and subscription', (done) => {
      callbackApi.fetchUserProfile('user_nested', (err, profile) => {
        expect(err).toBeNull();
        expect(profile.preferences).toEqual({
          theme: 'dark',
          language: 'en',
          notifications: true,
          itemsPerPage: 25,
        });
        expect(profile.subscription.features).toContain('analytics');
        expect(profile.subscription.features).toContain('export');
        done();
      });
    });
  });

  describe('fetchOrderHistory', () => {
    test('returns paginated orders without details', (done) => {
      callbackApi.fetchOrderHistory('user_abc', { page: 1, limit: 5 }, (err, result) => {
        expect(err).toBeNull();
        expect(result.orders).toHaveLength(5);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 5,
          total: 23,
          pages: 5,
        });
        result.orders.forEach((order) => {
          expect(order).toHaveProperty('orderId');
          expect(order).toHaveProperty('userId', 'user_abc');
        });
        done();
      });
    });

    test('returns orders with details when includeDetails is true', (done) => {
      callbackApi.fetchOrderHistory(
        'user_detail',
        { page: 1, limit: 3, includeDetails: true },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.orders).toHaveLength(3);
          result.orders.forEach((order) => {
            expect(order).toHaveProperty('details');
            expect(order.details).toHaveProperty('items');
            expect(order.details).toHaveProperty('total');
            expect(order).toHaveProperty('shipping');
            expect(order.shipping).toHaveProperty('status');
            expect(order.shipping).toHaveProperty('carrier', 'FastShip');
          });
          done();
        }
      );
    });

    test('returns error for invalid userId', (done) => {
      callbackApi.fetchOrderHistory(null, {}, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Invalid userId/);
        done();
      });
    });

    test('returns error for err_ prefixed userId', (done) => {
      callbackApi.fetchOrderHistory('err_fail', {}, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Failed to fetch/);
        done();
      });
    });

    test('handles last page with fewer results', (done) => {
      callbackApi.fetchOrderHistory('user_page', { page: 5, limit: 5 }, (err, result) => {
        expect(err).toBeNull();
        expect(result.orders).toHaveLength(3); // 23 total, page 5 = items 21-23
        expect(result.pagination.page).toBe(5);
        done();
      });
    });

    test('defaults to page 1, limit 10 when no options', (done) => {
      callbackApi.fetchOrderHistory('user_defaults', {}, (err, result) => {
        expect(err).toBeNull();
        expect(result.orders).toHaveLength(10);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
        done();
      });
    });
  });

  describe('fetchDashboardData', () => {
    test('returns complete dashboard for valid user', (done) => {
      callbackApi.fetchDashboardData('user_dash', (err, dashboard) => {
        expect(err).toBeNull();
        expect(dashboard).toHaveProperty('userId', 'user_dash');
        expect(dashboard).toHaveProperty('generatedAt');
        expect(dashboard).toHaveProperty('profile');
        expect(dashboard.profile).toHaveProperty('id', 'user_dash');
        expect(dashboard).toHaveProperty('recentOrders');
        expect(dashboard.recentOrders.length).toBeLessThanOrEqual(5);
        expect(dashboard).toHaveProperty('orderSummary');
        expect(dashboard.orderSummary).toHaveProperty('total', 23);
        expect(dashboard.errors).toBeNull();
        done();
      });
    });

    test('returns error for invalid userId', (done) => {
      callbackApi.fetchDashboardData(null, (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Invalid userId/);
        done();
      });
    });

    test('returns partial data when profile fails but orders succeed', (done) => {
      callbackApi.fetchDashboardData('err_profile', (err, dashboard) => {
        // err_ prefix causes all fetches to fail, so this should error
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/All data sources failed/);
        done();
      });
    });
  });
});

// ─── xmlParser tests ─────────────────────────────────────────────────

describe('Legacy xmlParser', () => {
  describe('parseProductCatalog', () => {
    test('parses valid product XML', () => {
      const xml = `
        <catalog>
          <product>
            <name>Widget A</name>
            <price>19.99</price>
            <category>electronics</category>
            <sku>WA-001</sku>
            <inStock>true</inStock>
          </product>
          <product>
            <name>Gadget B</name>
            <price>49.99</price>
            <category>electronics</category>
            <sku>GB-002</sku>
            <inStock>false</inStock>
          </product>
        </catalog>
      `;
      const result = xmlParser.parseProductCatalog(xml);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Widget A',
        price: 19.99,
        category: 'electronics',
        sku: 'WA-001',
        inStock: true,
      });
      expect(result[1].inStock).toBe(false);
    });

    test('returns empty array for null input', () => {
      expect(xmlParser.parseProductCatalog(null)).toEqual([]);
    });

    test('returns empty array for empty string', () => {
      expect(xmlParser.parseProductCatalog('')).toEqual([]);
    });

    test('handles missing fields with defaults', () => {
      const xml = '<catalog><product><name>Minimal</name></product></catalog>';
      const result = xmlParser.parseProductCatalog(xml);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Minimal',
        price: 0,
        category: 'uncategorized',
        sku: '',
        inStock: false,
      });
    });

    test('handles invalid price gracefully', () => {
      const xml = '<catalog><product><name>Bad Price</name><price>not-a-number</price></product></catalog>';
      const result = xmlParser.parseProductCatalog(xml);
      expect(result[0].price).toBe(0);
    });
  });

  describe('parseInventoryReport', () => {
    test('parses inventory items with nested location', () => {
      const xml = `
        <inventory>
          <item>
            <sku>SKU-001</sku>
            <quantity>150</quantity>
            <warehouse>west-1</warehouse>
            <location>
              <aisle>A</aisle>
              <shelf>3</shelf>
              <bin>12</bin>
            </location>
            <lastCounted>2026-01-15</lastCounted>
            <reorderThreshold>50</reorderThreshold>
          </item>
        </inventory>
      `;
      const result = xmlParser.parseInventoryReport(xml);
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
      const xml = `
        <inventory>
          <item>
            <sku>LOW-001</sku>
            <quantity>5</quantity>
            <reorderThreshold>10</reorderThreshold>
          </item>
          <item>
            <sku>OK-001</sku>
            <quantity>100</quantity>
            <reorderThreshold>10</reorderThreshold>
          </item>
          <item>
            <sku>EXACT-001</sku>
            <quantity>10</quantity>
            <reorderThreshold>10</reorderThreshold>
          </item>
        </inventory>
      `;
      const result = xmlParser.parseInventoryReport(xml);
      expect(result[0].needsReorder).toBe(true);
      expect(result[1].needsReorder).toBe(false);
      expect(result[2].needsReorder).toBe(true); // quantity === threshold
    });

    test('returns empty array for invalid input', () => {
      expect(xmlParser.parseInventoryReport(null)).toEqual([]);
      expect(xmlParser.parseInventoryReport('')).toEqual([]);
    });
  });

  describe('convertCatalogToXml', () => {
    test('converts products to XML string', () => {
      const products = [
        { name: 'Test', price: 9.99, category: 'misc', sku: 'T-001', inStock: true },
      ];
      const xml = xmlParser.convertCatalogToXml(products);
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<name>Test</name>');
      expect(xml).toContain('<price>9.99</price>');
      expect(xml).toContain('<inStock>true</inStock>');
    });

    test('returns empty catalog for null input', () => {
      expect(xmlParser.convertCatalogToXml(null)).toBe('<catalog></catalog>');
    });

    test('returns empty catalog for non-array input', () => {
      expect(xmlParser.convertCatalogToXml('not an array')).toBe('<catalog></catalog>');
    });

    test('handles missing product fields', () => {
      const xml = xmlParser.convertCatalogToXml([{}]);
      expect(xml).toContain('<name>Unknown</name>');
      expect(xml).toContain('<price>0.00</price>');
      expect(xml).toContain('<category>uncategorized</category>');
    });

    test('formats price to two decimal places', () => {
      const xml = xmlParser.convertCatalogToXml([{ name: 'X', price: 10 }]);
      expect(xml).toContain('<price>10.00</price>');
    });
  });
});
