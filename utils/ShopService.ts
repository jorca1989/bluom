// @ts-ignore - shopify-buy doesn't have proper TypeScript definitions
import Client from 'shopify-buy';

// Initialize the Shopify Client
// Note: You will need to replace these with actual Storefront API credentials
// from your Shopify Admin -> Apps -> Storefront API
const client = Client.buildClient({
  domain: 'bluom-app.myshopify.com', // Replace with your shop domain
  storefrontAccessToken: 'REPLACE_WITH_YOUR_STOREFRONT_TOKEN', // Replace with your token
  apiVersion: '2024-01',
});

export const ShopService = {
  client,
  
  async fetchAllProducts() {
    try {
      return await client.product.fetchAll();
    } catch (e) {
      console.error('[ShopService] fetchAllProducts failed', e);
      return [];
    }
  },

  async fetchCollectionByHandle(handle: string) {
    try {
      return await client.collection.fetchByHandle(handle);
    } catch (e) {
      console.error('[ShopService] fetchCollection failed', e);
      return null;
    }
  }
};

export default ShopService;

