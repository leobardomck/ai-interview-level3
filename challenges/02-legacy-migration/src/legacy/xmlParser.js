'use strict';

function parseProductCatalog(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    return [];
  }

  var products = [];
  var searchStart = 0;
  var productOpenTag = '<product>';
  var productCloseTag = '</product>';

  while (true) {
    var productStart = xmlString.indexOf(productOpenTag, searchStart);
    if (productStart === -1) break;

    var productEnd = xmlString.indexOf(productCloseTag, productStart);
    if (productEnd === -1) break;

    var productBlock = xmlString.substring(
      productStart + productOpenTag.length,
      productEnd
    );

    var product = {};

    var nameMatch = productBlock.match(/<name>([\s\S]*?)<\/name>/);
    if (nameMatch) {
      product.name = nameMatch[1].trim();
    } else {
      product.name = 'Unknown';
    }

    var priceMatch = productBlock.match(/<price>([\s\S]*?)<\/price>/);
    if (priceMatch) {
      var priceVal = parseFloat(priceMatch[1].trim());
      product.price = isNaN(priceVal) ? 0 : priceVal;
    } else {
      product.price = 0;
    }

    var categoryMatch = productBlock.match(/<category>([\s\S]*?)<\/category>/);
    if (categoryMatch) {
      product.category = categoryMatch[1].trim();
    } else {
      product.category = 'uncategorized';
    }

    var skuMatch = productBlock.match(/<sku>([\s\S]*?)<\/sku>/);
    if (skuMatch) {
      product.sku = skuMatch[1].trim();
    } else {
      product.sku = '';
    }

    var inStockMatch = productBlock.match(/<inStock>([\s\S]*?)<\/inStock>/);
    if (inStockMatch) {
      product.inStock = inStockMatch[1].trim().toLowerCase() === 'true';
    } else {
      product.inStock = false;
    }

    products.push(product);
    searchStart = productEnd + productCloseTag.length;
  }

  return products;
}

function parseInventoryReport(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    return [];
  }

  var items = [];
  var searchStart = 0;
  var itemOpen = '<item>';
  var itemClose = '</item>';

  while (true) {
    var itemStart = xmlString.indexOf(itemOpen, searchStart);
    if (itemStart === -1) break;

    var itemEnd = xmlString.indexOf(itemClose, itemStart);
    if (itemEnd === -1) break;

    var itemBlock = xmlString.substring(itemStart + itemOpen.length, itemEnd);

    var item = {};

    var skuMatch = itemBlock.match(/<sku>([\s\S]*?)<\/sku>/);
    item.sku = skuMatch ? skuMatch[1].trim() : '';

    var qtyMatch = itemBlock.match(/<quantity>([\s\S]*?)<\/quantity>/);
    item.quantity = qtyMatch ? parseInt(qtyMatch[1].trim(), 10) : 0;
    if (isNaN(item.quantity)) item.quantity = 0;

    var warehouseMatch = itemBlock.match(/<warehouse>([\s\S]*?)<\/warehouse>/);
    item.warehouse = warehouseMatch ? warehouseMatch[1].trim() : 'default';

    var locationBlock = itemBlock.match(/<location>([\s\S]*?)<\/location>/);
    if (locationBlock) {
      var locContent = locationBlock[1];
      var aisleMatch = locContent.match(/<aisle>([\s\S]*?)<\/aisle>/);
      var shelfMatch = locContent.match(/<shelf>([\s\S]*?)<\/shelf>/);
      var binMatch = locContent.match(/<bin>([\s\S]*?)<\/bin>/);
      item.location = {
        aisle: aisleMatch ? aisleMatch[1].trim() : '',
        shelf: shelfMatch ? shelfMatch[1].trim() : '',
        bin: binMatch ? binMatch[1].trim() : ''
      };
    } else {
      item.location = { aisle: '', shelf: '', bin: '' };
    }

    var lastCountedMatch = itemBlock.match(/<lastCounted>([\s\S]*?)<\/lastCounted>/);
    item.lastCounted = lastCountedMatch ? lastCountedMatch[1].trim() : null;

    var reorderMatch = itemBlock.match(/<reorderThreshold>([\s\S]*?)<\/reorderThreshold>/);
    item.reorderThreshold = reorderMatch ? parseInt(reorderMatch[1].trim(), 10) : 0;
    if (isNaN(item.reorderThreshold)) item.reorderThreshold = 0;

    item.needsReorder = item.quantity <= item.reorderThreshold;

    items.push(item);
    searchStart = itemEnd + itemClose.length;
  }

  return items;
}

function convertCatalogToXml(products) {
  if (!products || !Array.isArray(products)) {
    return '<catalog></catalog>';
  }

  var xml = '';
  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<catalog>\n';

  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    xml += '  <product>\n';
    xml += '    <name>' + (p.name || 'Unknown') + '</name>\n';
    xml += '    <price>' + (typeof p.price === 'number' ? p.price.toFixed(2) : '0.00') + '</price>\n';
    xml += '    <category>' + (p.category || 'uncategorized') + '</category>\n';
    xml += '    <sku>' + (p.sku || '') + '</sku>\n';
    xml += '    <inStock>' + (p.inStock ? 'true' : 'false') + '</inStock>\n';
    xml += '  </product>\n';
  }

  xml += '</catalog>';

  return xml;
}

module.exports = {
  parseProductCatalog: parseProductCatalog,
  parseInventoryReport: parseInventoryReport,
  convertCatalogToXml: convertCatalogToXml
};
