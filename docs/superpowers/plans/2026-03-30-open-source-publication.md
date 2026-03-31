# Open Source Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare @energio/holded-mcp for public release on GitHub, npm, and MCP registries.

**Architecture:** Update package metadata and README for discoverability, create MCP Registry metadata file, then publish to npm and submit to registries. All changes are configuration/documentation — no source code changes.

**Tech Stack:** npm, GitHub CLI (`gh`), `mcp-publisher` CLI

---

### Task 1: Update package.json

**Files:**
- Modify: `package.json:25-31` (keywords) and add `mcpName` field

- [ ] **Step 1: Update keywords**

Replace the existing `keywords` array with:

```json
"keywords": [
  "holded",
  "mcp",
  "mcp-server",
  "model-context-protocol"
],
```

- [ ] **Step 2: Add mcpName**

Add the `mcpName` field after the `keywords` array (required by the Official MCP Registry for ownership verification):

```json
"mcpName": "io.github.energio-es/holded-mcp",
```

- [ ] **Step 3: Verify package.json is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: update keywords and add mcpName for MCP Registry"
```

---

### Task 2: Create server.json for Official MCP Registry

**Files:**
- Create: `server.json`

- [ ] **Step 1: Create server.json**

Create `server.json` in the project root:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.energio-es/holded-mcp",
  "description": "MCP server for Holded — invoicing, accounting, CRM, projects, and team",
  "repository": {
    "url": "https://github.com/energio-es/holded-mcp",
    "source": "github"
  },
  "version_detail": {
    "version": "1.0.0"
  },
  "packages": [
    {
      "registry_name": "npm",
      "name": "@energio/holded-mcp",
      "version": "1.0.0",
      "runtime": "node",
      "runtime_arguments": [],
      "package_arguments": [],
      "environment_variables": [
        {
          "name": "HOLDED_API_KEY",
          "description": "Your Holded API key. Get it from https://app.holded.com/api",
          "required": true
        },
        {
          "name": "HOLDED_MODULES",
          "description": "Comma-separated list of modules to enable (invoicing, crm, projects, accounting, team). All enabled by default.",
          "required": false
        },
        {
          "name": "HOLDED_RATE_LIMIT_PER_SECOND",
          "description": "API rate limit in requests per second. Default: 10.",
          "required": false
        },
        {
          "name": "HOLDED_DEBUG",
          "description": "Set to 'true' to enable debug logging for API requests.",
          "required": false
        }
      ],
      "transport": {
        "type": "stdio"
      }
    }
  ]
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('server.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add server.json
git commit -m "chore: add server.json for Official MCP Registry"
```

---

### Task 3: Add npm version badge to README

**Files:**
- Modify: `README.md:1-5` (badge line)

- [ ] **Step 1: Add npm badge**

Insert the npm version badge as the first badge on line 3, before the existing License badge. The badge line should become:

```markdown
[![npm version](https://img.shields.io/npm/v/@energio%2Fholded-mcp.svg)](https://www.npmjs.com/package/@energio/holded-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/energio-es/holded-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/energio-es/holded-mcp/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add npm version badge to README"
```

---

### Task 4: Add Claude Code, VS Code, and Windsurf installation sections to README

**Files:**
- Modify: `README.md:60-173` (Installation section)

- [ ] **Step 1: Reorder existing sections and add new ones**

Replace the entire Installation section (from `## Installation` through the end of the `### Build from Source` section, lines 60-173) with the following. The order is: Prerequisites, Quick Start, Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, Other MCP-Compatible Agents.

```markdown
## Installation

### Prerequisites

1. **Node.js** >= 20 (check with `node --version`)
2. **Holded API Key** - Get yours from [Holded API Settings](https://app.holded.com/api) or go to Configuration (top bar) → API

### Quick Start (npx)

The easiest way to use this MCP server is via `npx` - no installation or build required! Just configure your MCP client as shown below.

### Setup for Claude Desktop

Add the following to your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop to load the server.

### Setup for Claude Code

Add the server with a single command:

```bash
claude mcp add holded -- npx -y @energio/holded-mcp
```

Then set the API key in your environment:

```bash
export HOLDED_API_KEY=your_api_key_here
```

### Setup for Cursor

Add the following to your Cursor MCP settings file:

- **macOS**: `~/.cursor/mcp.json`
- **Windows**: `%APPDATA%\Cursor\mcp.json`
- **Linux**: `~/.config/cursor/mcp.json`

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

After saving, restart Cursor or reload the MCP servers from the settings.

### Setup for VS Code

Add the following to your VS Code user settings (`settings.json`) or workspace settings (`.vscode/mcp.json`):

**User settings (`settings.json`):**

```json
{
  "mcp": {
    "servers": {
      "holded": {
        "command": "npx",
        "args": ["-y", "@energio/holded-mcp"],
        "env": {
          "HOLDED_API_KEY": "your_api_key_here"
        }
      }
    }
  }
}
```

**Workspace settings (`.vscode/mcp.json`):**

```json
{
  "servers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Setup for Windsurf

Add the following to your Windsurf MCP configuration file:

- **macOS**: `~/.codeium/windsurf/mcp_config.json`
- **Windows**: `%APPDATA%\Codeium\windsurf\mcp_config.json`
- **Linux**: `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Setup for Other MCP-Compatible Agents

Any MCP-compatible agent can use this server via npx. The general configuration requires:

1. **Command**: `npx`
2. **Arguments**: `["-y", "@energio/holded-mcp"]`
3. **Environment variable**: `HOLDED_API_KEY` with your API key

Example configuration:

```json
{
  "mcpServers": {
    "holded": {
      "command": "npx",
      "args": ["-y", "@energio/holded-mcp"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

The server communicates via stdio using the MCP protocol and can be integrated with any client that supports the [Model Context Protocol](https://modelcontextprotocol.io/).
```

- [ ] **Step 2: Move "Build from Source" to Development section**

In the Development section (currently at line ~922), add the "Build from Source" subsection before the existing content. Replace:

```markdown
## Development

```bash
# Install dependencies
npm install
```

With:

```markdown
## Development

### Build from Source

If you want to build from source (for development or contributions):

```bash
git clone https://github.com/energio-es/holded-mcp.git
cd holded-mcp
npm install
npm run build
```

Then use the built server in your MCP client configuration:

```json
{
  "mcpServers": {
    "holded": {
      "command": "node",
      "args": ["/absolute/path/to/holded-mcp/dist/index.js"],
      "env": {
        "HOLDED_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Development Commands

```bash
# Install dependencies
npm install
```

- [ ] **Step 3: Verify README renders correctly**

Visually scan the file for broken markdown — check that all code blocks are closed, headings are correct, and the Table of Contents links still work.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add Claude Code, VS Code, and Windsurf installation sections"
```

---

### Task 5: Build and test

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Dry-run npm publish**

Run: `npm publish --dry-run`
Expected: Shows the package contents that would be published (dist/, README.md, LICENSE). Verify no unexpected files are included.

---

### Task 6: Publish to npm

This task requires the user to be logged into npm (`npm whoami`).

- [ ] **Step 1: Verify npm login**

Run: `npm whoami`
Expected: Shows the logged-in npm username

- [ ] **Step 2: Publish**

Run: `npm publish`
Expected: Package published successfully as `@energio/holded-mcp@1.0.0`

- [ ] **Step 3: Verify on npm**

Run: `npm view @energio/holded-mcp`
Expected: Shows package metadata with correct version, description, keywords

---

### Task 7: GitHub repository setup and release

- [ ] **Step 1: Push all commits to GitHub**

Run: `git push origin main`

- [ ] **Step 2: Make repo public (if private)**

This is a manual step in GitHub Settings > General > Danger Zone > Change repository visibility.

- [ ] **Step 3: Set repository description**

Run: `gh repo edit energio-es/holded-mcp --description "MCP server for Holded — invoicing, accounting, CRM, projects, and team"`

- [ ] **Step 4: Set repository topics**

Run: `gh repo edit energio-es/holded-mcp --add-topic mcp --add-topic mcp-server --add-topic holded --add-topic model-context-protocol --add-topic typescript`

- [ ] **Step 5: Create GitHub release**

Run:
```bash
gh release create v1.0.0 --title "v1.0.0" --notes "$(cat <<'EOF'
## Holded MCP Server v1.0.0

Complete MCP server implementation with 143 tools covering all Holded API endpoints.

### Modules
- **Invoicing** (76 endpoints) — Contacts, Products, Documents (12 types), Payments, Treasury, Numbering Series, Warehouses, Sales Channels, Services, Taxes, Remittances
- **CRM** (27 endpoints) — Leads with stages/notes/tasks, Funnels, Events, Bookings
- **Projects** (14 endpoints) — Projects, Tasks, Time Tracking
- **Accounting** (5 endpoints) — Chart of Accounts, Daily Ledger
- **Team** (15 endpoints) — Employees, Time Tracking with clock in/out

### Technical Highlights
- TypeScript with strict mode
- Zod schema validation for all inputs
- Automatic retry with exponential backoff on transient failures
- Configurable rate limiting
- Module selection via `HOLDED_MODULES` environment variable
- JSON and Markdown response formats

### Installation

```
npx -y @energio/holded-mcp
```

See [README](https://github.com/energio-es/holded-mcp#readme) for full setup instructions.
EOF
)"
```

---

### Task 8: Publish to Official MCP Registry

This task requires the `mcp-publisher` CLI.

- [ ] **Step 1: Install mcp-publisher**

Run: `brew install mcp-publisher`
(Or download from the mcp-publisher GitHub releases page)

- [ ] **Step 2: Authenticate with GitHub**

Run: `mcp-publisher login github`
Expected: Opens a browser for GitHub OAuth device flow

- [ ] **Step 3: Publish to MCP Registry**

Run: `mcp-publisher publish`
Expected: Server published successfully to the Official MCP Registry

---

### Task 9: Submit to remaining MCP registries

These are all manual web form submissions. Complete after npm is live and GitHub repo is public.

- [ ] **Step 1: MCP Directory (FastMCP)**

Go to `https://mcp.directory/submit` and submit the GitHub URL: `https://github.com/energio-es/holded-mcp`

- [ ] **Step 2: MCP.SO**

Go to `https://mcp.so/submit` and submit server details.

- [ ] **Step 3: Glama.ai**

Go to `https://glama.ai/mcp/servers` and click "Add Server". Submit the GitHub URL.

- [ ] **Step 4: SkillsIndex**

Go to `https://skillsindex.dev/submit` and fill in:
- Tool Name: Holded MCP Server
- GitHub URL: `https://github.com/energio-es/holded-mcp`
- Description: MCP server for Holded — invoicing, accounting, CRM, projects, and team
- Category: Finance & Fintech
- Ecosystem: MCP Server

- [ ] **Step 5: OpenTools**

Schedule a call at `https://calendly.com/andy-opentools/15-mins-with-opentools` to discuss listing.
