#!/usr/bin/env tsx
/**
 * Extract complete OpenAPI specs from the Holded developer docs (ReadMe.io).
 *
 * ReadMe.io embeds the full OpenAPI spec in each endpoint page's ssr-props.
 * We only need to fetch one endpoint per API module to get the complete spec.
 *
 * See holded_api_specs/EXTRACTION.md for details.
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DOCS_BASE = 'https://developers.holded.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' };

interface ApiModule {
  filename: string;
  uri: string;
  schema: Record<string, any>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch a page's HTML and parse its ssr-props JSON.
 */
async function fetchPage(path: string): Promise<{ dom: JSDOM; ssrProps: Record<string, any> }> {
  const url = `${DOCS_BASE}${path}`;
  console.log(`Fetching ${url}`);
  const { data } = await axios.get(url, { headers: HEADERS });
  const dom = new JSDOM(data);
  const script = dom.window.document.querySelector('script#ssr-props');
  if (!script?.textContent) throw new Error(`No ssr-props found at ${url}`);
  return { dom, ssrProps: JSON.parse(script.textContent) };
}

/**
 * Discover all API modules by fetching the reference page once, then fetching
 * one endpoint per module to extract the full OpenAPI schema.
 */
async function discoverModules(): Promise<{ modules: ApiModule[]; endpointSlugs: string[] }> {
  const { dom, ssrProps } = await fetchPage('/reference');

  const apiDefs: { filename: string; uri: string }[] = ssrProps.apiDefinitions ?? [];
  console.log(`Found ${apiDefs.length} API modules: ${apiDefs.map(d => d.filename).join(', ')}\n`);

  // Collect candidate endpoint slugs from nav links
  const links = dom.window.document.querySelectorAll('nav a[href^="/reference/"]');
  const endpointSlugs: string[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href?.match(/^\/reference\/[a-z][a-z0-9-]*$/)) {
      endpointSlugs.push(href);
    }
  }

  // Fetch candidates until we've found one endpoint per module, capturing schemas
  const targetUris = new Set(apiDefs.map(d => d.uri));
  const foundModules = new Map<string, ApiModule>();

  for (const slug of endpointSlugs) {
    if (foundModules.size === targetUris.size) break;

    try {
      const { ssrProps: props } = await fetchPage(slug);
      const api = props.document?.api;
      const uri: string | undefined = api?.uri;
      const schema = api?.schema;
      if (uri && schema && targetUris.has(uri) && !foundModules.has(uri)) {
        const filename = uri.split('/').pop()!;
        foundModules.set(uri, { filename, uri, schema });
        console.log(`  ${filename} → ${slug}`);
      }
    } catch {
      // skip pages without API data (category pages, etc.)
    }

    await sleep(100);
  }

  return { modules: [...foundModules.values()], endpointSlugs };
}

async function main() {
  const specsDir = join(process.cwd(), 'holded_api_specs');
  const docsDir = join(process.cwd(), 'holded_docs');
  if (!existsSync(specsDir)) mkdirSync(specsDir, { recursive: true });
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });

  console.log('=== Discovering API modules ===\n');
  const { modules, endpointSlugs } = await discoverModules();

  console.log(`\n=== Saving OpenAPI specs (${modules.length} modules) ===\n`);

  for (const mod of modules) {
    const specPath = join(specsDir, mod.filename);
    writeFileSync(specPath, JSON.stringify(mod.schema, null, 2) + '\n', 'utf-8');

    const title = mod.schema.info?.title ?? 'Unknown';
    const pathCount = Object.keys(mod.schema.paths ?? {}).length;
    console.log(`  ✓ ${mod.filename} — ${title} (${pathCount} paths)`);
  }

  // Also scrape per-endpoint markdown docs
  console.log('\n=== Scraping endpoint markdown docs ===\n');

  let scraped = 0;
  let failed = 0;
  for (const href of endpointSlugs) {
    const slug = href.replace('/reference/', '');
    const mdUrl = `${DOCS_BASE}${href}.md`;

    try {
      const { data } = await axios.get(mdUrl, { headers: HEADERS });
      writeFileSync(join(docsDir, `${slug}.md`), data, 'utf-8');
      scraped++;
    } catch {
      failed++;
    }

    await sleep(100);
  }

  console.log(`  Scraped ${scraped} endpoint docs (${failed} failed)\n`);
  console.log('Done!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error('Fatal:', e.message ?? e);
    process.exit(1);
  });
}
