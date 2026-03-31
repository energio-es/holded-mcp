#!/usr/bin/env tsx
/**
 * Scrape all Holded API documentation endpoints
 * 
 * This script:
 * 1. Fetches the main reference page HTML to discover all endpoint links
 * 2. Fetches each endpoint's .md version which contains embedded OpenAPI specs
 * 3. Parses OpenAPI specs (YAML/JSON) from markdown code blocks
 * 4. Extracts all documentation content (title, method, URL, description, parameters)
 * 5. Saves each endpoint to a markdown file in holded_docs/ using URL-based naming
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

interface EndpointInfo {
  name: string;
  method: string;  // GET, POST, PUT, DELETE
  docUrl: string;
  category: string;
  subcategory: string;
}


/**
 * Discover all endpoints from the sidebar navigation
 */
async function discoverEndpoints(): Promise<EndpointInfo[]> {
  console.log('Fetching Holded documentation page...');
  const response = await axios.get('https://developers.holded.com/reference', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const dom = new JSDOM(response.data);
  const document = dom.window.document;
  
  // Extract all endpoint links with their method badges
  console.log('Extracting endpoint links...');
  const endpoints: EndpointInfo[] = [];
  
  // Find all links in the navigation that point to /reference/
  const links = document.querySelectorAll('nav a[href^="/reference/"]');
  console.log(`Found ${links.length} links in navigation`);
  
  // Helper function to find parent category/section from DOM structure
  function findCategoryFromNav(link: Element): {category: string, subcategory: string} {
    let category = 'other';
    let subcategory = 'general';
    
    try {
      // Walk up the DOM tree to find section headers
      let current: Element | null = link.parentElement;
      for (let depth = 0; depth < 10 && current; depth++) {
        const text = current.textContent || '';
        const upperText = text.toUpperCase().trim();
        
        // Look for main category headers
        if (upperText.includes('INVOICE') || upperText.includes('INVOICING')) {
          category = 'invoicing';
        } else if (upperText.includes('CRM')) {
          category = 'crm';
        } else if (upperText.includes('PROJECT')) {
          category = 'projects';
        } else if (upperText.includes('TEAM') || upperText.includes('EMPLOYEE')) {
          category = 'team';
        } else if (upperText.includes('ACCOUNTING') || upperText.includes('LEDGER')) {
          category = 'accounting';
        }
        
        // Look for subcategory headers
        if (category !== 'other') {
          if (upperText.includes('TREASUR')) {
            subcategory = 'treasuries';
          } else if (upperText.includes('CONTACT') && !upperText.includes('GROUP')) {
            subcategory = 'contacts';
          } else if (upperText.includes('PRODUCT')) {
            subcategory = 'products';
          } else if (upperText.includes('DOCUMENT')) {
            subcategory = 'documents';
          } else if (upperText.includes('EXPENSE')) {
            subcategory = 'expenses-accounts';
          } else if (upperText.includes('NUMBERING')) {
            subcategory = 'numbering-series';
          } else if (upperText.includes('SALES-CHANNEL') || upperText.includes('SALES CHANNEL')) {
            subcategory = 'sales-channels';
          } else if (upperText.includes('WAREHOUSE')) {
            subcategory = 'warehouses';
          } else if (upperText.includes('PAYMENT')) {
            subcategory = 'payments';
          } else if (upperText.includes('TAX')) {
            subcategory = 'taxes';
          } else if (upperText.includes('CONTACT-GROUP') || upperText.includes('CONTACT GROUP')) {
            subcategory = 'contact-groups';
          } else if (upperText.includes('REMITTANCE')) {
            subcategory = 'remittances';
          } else if (upperText.includes('SERVICE')) {
            subcategory = 'services';
          } else if (upperText.includes('FUNNEL')) {
            subcategory = 'funnels';
          } else if (upperText.includes('LEAD')) {
            subcategory = 'leads';
          } else if (upperText.includes('EVENT')) {
            subcategory = 'events';
          } else if (upperText.includes('BOOKING')) {
            subcategory = 'bookings';
          } else if (upperText.includes('TASK')) {
            subcategory = 'tasks';
          } else if (upperText.includes('TIME') && upperText.includes('TRACK')) {
            subcategory = 'time-tracking';
          } else if (upperText.includes('EMPLOYEE')) {
            subcategory = 'employees';
          } else if (upperText.includes('ACCOUNT') && category === 'accounting') {
            subcategory = 'accounts';
          } else if (upperText.includes('DAILY') && upperText.includes('LEDGER')) {
            subcategory = 'daily-ledger';
          }
        }
        
        // Stop if we found both category and subcategory
        if (category !== 'other' && subcategory !== 'general') {
          break;
        }
        
        current = current.parentElement;
      }
    } catch {
      // Fall back to URL-based detection
    }
    
    return { category, subcategory };
  }
  
  for (const link of links) {
    try {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim() || '';
      
      if (!href || !text) continue;
      
      // Skip non-endpoint links (like "Introduction", "API Key", etc.)
      if (href.includes('/reference/') && !href.match(/\/reference\/[a-z-]+$/)) {
        continue;
      }
      
      // Try to find method badge near the link
      let method = 'GET'; // Default
      try {
        // Look for method badge in the same container or nearby
        const parent = link.parentElement;
        if (parent) {
          const methodBadge = parent.querySelector('.rm-MethodBadge, [class*="Method"], [class*="method"]');
          if (methodBadge) {
            const methodText = methodBadge.textContent?.trim();
            if (methodText) {
              method = methodText.toUpperCase();
            }
          } else {
            // Try to find method in the link text itself
            const linkText = text.toLowerCase();
            if (linkText.includes('list') || linkText.includes('get')) {
              method = 'GET';
            } else if (linkText.includes('create')) {
              method = 'POST';
            } else if (linkText.includes('update')) {
              method = 'PUT';
            } else if (linkText.includes('delete')) {
              method = 'DELETE';
            }
          }
        }
      } catch {
        // Use default method
      }
      
      // Determine category and subcategory from navigation DOM structure
      const { category, subcategory } = findCategoryFromNav(link);
      
      // Fallback: Try to extract from URL path if DOM traversal didn't work
      let finalCategory = category;
      let finalSubcategory = subcategory;
      
      if (finalCategory === 'other') {
        if (href.includes('invoicing')) {
          finalCategory = 'invoicing';
        } else if (href.includes('crm')) {
          finalCategory = 'crm';
        } else if (href.includes('projects')) {
          finalCategory = 'projects';
        } else if (href.includes('team') || href.includes('employee')) {
          finalCategory = 'team';
        } else if (href.includes('accounting') || href.includes('account') || href.includes('ledger')) {
          finalCategory = 'accounting';
        }
      }
      
      // Fallback: Try to determine subcategory from URL if DOM traversal didn't find it
      if (finalSubcategory === 'general') {
        const urlParts = href.split('/').filter(p => p);
        if (urlParts.length > 1) {
          const lastPart = urlParts[urlParts.length - 1];
          // Remove method prefixes like "list-", "create-", "get-", etc.
          const subcategoryPart = lastPart
            .replace(/^(list|create|get|update|delete)-/, '')
            .replace(/-1$/, '');
          
          // Map common patterns
          if (subcategoryPart.includes('treasur')) {
            finalSubcategory = 'treasuries';
          } else if (subcategoryPart.includes('contact') && !subcategoryPart.includes('group')) {
            finalSubcategory = 'contacts';
          } else if (subcategoryPart.includes('product')) {
            finalSubcategory = 'products';
          } else if (subcategoryPart.includes('document')) {
            finalSubcategory = 'documents';
          } else if (subcategoryPart.includes('expense')) {
            finalSubcategory = 'expenses-accounts';
          } else if (subcategoryPart.includes('numbering')) {
            finalSubcategory = 'numbering-series';
          } else if (subcategoryPart.includes('sales-channel')) {
            finalSubcategory = 'sales-channels';
          } else if (subcategoryPart.includes('warehouse')) {
            finalSubcategory = 'warehouses';
          } else if (subcategoryPart.includes('payment')) {
            finalSubcategory = 'payments';
          } else if (subcategoryPart.includes('tax')) {
            finalSubcategory = 'taxes';
          } else if (subcategoryPart.includes('contact-group')) {
            finalSubcategory = 'contact-groups';
          } else if (subcategoryPart.includes('remittance')) {
            finalSubcategory = 'remittances';
          } else if (subcategoryPart.includes('service')) {
            finalSubcategory = 'services';
          } else if (subcategoryPart.includes('funnel')) {
            finalSubcategory = 'funnels';
          } else if (subcategoryPart.includes('lead')) {
            finalSubcategory = 'leads';
          } else if (subcategoryPart.includes('event')) {
            finalSubcategory = 'events';
          } else if (subcategoryPart.includes('booking')) {
            finalSubcategory = 'bookings';
          } else if (subcategoryPart.includes('project')) {
            finalSubcategory = 'projects';
          } else if (subcategoryPart.includes('task')) {
            finalSubcategory = 'tasks';
          } else if (subcategoryPart.includes('time')) {
            finalSubcategory = 'time-tracking';
          } else if (subcategoryPart.includes('employee')) {
            finalSubcategory = 'employees';
          } else if (subcategoryPart.includes('account') && finalCategory === 'accounting') {
            finalSubcategory = 'accounts';
          } else if (subcategoryPart.includes('ledger')) {
            finalSubcategory = 'daily-ledger';
          } else if (subcategoryPart) {
            finalSubcategory = subcategoryPart;
          }
        }
      }
      
      endpoints.push({
        name: text,
        method,
        docUrl: href.startsWith('http') ? href : `https://developers.holded.com${href}`,
        category: finalCategory,
        subcategory: finalSubcategory,
      });
    } catch (e) {
      console.warn(`Error processing link:`, e);
    }
  }
  
  console.log(`Discovered ${endpoints.length} endpoints`);
  return endpoints;
}

/**
 * Fetch a single endpoint documentation page (.md version)
 */
async function scrapeEndpoint(endpoint: EndpointInfo): Promise<string> {
  // Construct .md URL
  const baseUrl = endpoint.docUrl.startsWith('http') 
    ? endpoint.docUrl 
    : `https://developers.holded.com${endpoint.docUrl}`;
  const mdUrl = `${baseUrl}.md`;
  console.log(`  Fetching: ${mdUrl}`);
  
  try {
    const response = await axios.get(mdUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    return response.data;
  } catch (e: any) {
    if (e.response?.status === 404) {
      console.warn(`  .md version not found, skipping...`);
      throw new Error(`Markdown version not available for ${endpoint.docUrl}`);
    }
    throw e;
  }
}

/**
 * Save markdown documentation to file
 */
function saveDoc(markdown: string, endpoint: EndpointInfo, baseDir: string) {
  // Extract slug from URL: /reference/api-key -> api-key
  const urlPath = endpoint.docUrl.replace(/^https?:\/\/[^/]+/, ''); // Remove domain if present
  const slug = urlPath.replace('/reference/', '').replace(/\//g, '-');
  
  const filePath = join(baseDir, `${slug}.md`);
  
  // Ensure base directory exists
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  
  writeFileSync(filePath, markdown, 'utf-8');
  console.log(`  ✓ Saved: ${filePath}`);
}

/**
 * Helper function to sleep/delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  const outputDir = join(process.cwd(), 'holded_docs');
  
  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Step 1: Discover all endpoints from sidebar
    console.log('\n=== Step 1: Discovering endpoints ===');
    const endpoints = await discoverEndpoints();
    
    if (endpoints.length === 0) {
      console.error('No endpoints discovered. Check the navigation structure.');
      process.exit(1);
    }
    
    console.log(`\nFound ${endpoints.length} endpoints to scrape\n`);
    
    // Step 2: Scrape each endpoint
    console.log('=== Step 2: Scraping endpoints ===\n');
    const progressFile = join(process.cwd(), 'scripts', 'scrape-progress.json');
    let completed = 0;
    let failed: string[] = [];
    
    // Load progress if exists
    if (existsSync(progressFile)) {
      try {
        const progress = JSON.parse(readFileSync(progressFile, 'utf-8'));
        completed = progress.completed || 0;
        failed = progress.failed || [];
        console.log(`Resuming from endpoint ${completed + 1}...\n`);
      } catch {
        // Start fresh
      }
    }
    
    for (let i = completed; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      console.log(`[${i + 1}/${endpoints.length}] ${endpoint.method} ${endpoint.name}`);
      
      try {
        const markdown = await scrapeEndpoint(endpoint);
        saveDoc(markdown, endpoint, outputDir);
        
        // Save progress
        writeFileSync(progressFile, JSON.stringify({
          completed: i + 1,
          failed,
        }, null, 2), 'utf-8');
        
        // Rate limiting - wait 100ms between requests
        await sleep(100);
      } catch (e: any) {
        console.error(`  ✗ Error scraping ${endpoint.name}:`, e.message || e);
        failed.push(endpoint.docUrl);
      }
    }
    
    console.log(`\n=== Complete ===`);
    console.log(`Scraped ${endpoints.length - failed.length}/${endpoints.length} endpoints`);
    if (failed.length > 0) {
      console.log(`Failed endpoints: ${failed.length}`);
      console.log('Failed URLs:', failed);
    }
    
    // Remove progress file on successful completion
    if (existsSync(progressFile)) {
      try {
        unlinkSync(progressFile);
        console.log('\nProgress file removed.');
      } catch (e) {
        console.warn('Failed to remove progress file:', e);
      }
    }
    
  } catch (e: any) {
    console.error('Fatal error:', e.message || e);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
