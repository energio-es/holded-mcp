# Open Source Publication Preparation

Prepare the holded-mcp-server project for public release on GitHub, npm, and MCP registries.

## Context

The project is a TypeScript MCP server providing 143 tools for the Holded business management API. It already has comprehensive documentation (README, LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, GOVERNANCE, SECURITY, CHANGELOG), CI/CD (GitHub Actions on Node 20/22/24), and Dependabot configured. The codebase is clean with no secrets in git history.

## Scope

### 1. Package.json Updates

**Keywords** — replace current 5 keywords with 4 focused ones:
```json
"keywords": ["holded", "mcp", "mcp-server", "model-context-protocol"]
```

**MCP Registry name** — add for Official MCP Registry ownership verification:
```json
"mcpName": "io.github.energio-es/holded-mcp-server"
```

### 2. README Enhancements

**Badges** — add npm version badge as the first badge:
```markdown
[![npm version](https://img.shields.io/npm/v/holded-mcp-server.svg)](https://www.npmjs.com/package/holded-mcp-server)
```

**Installation sections** — expand from 3 to 6 client-specific sections:

1. **Claude Desktop** — keep existing
2. **Claude Code (CLI)** — new, one-liner using `claude mcp add`
3. **Cursor** — keep existing
4. **VS Code** — new, uses `settings.json` with `"mcp": { "servers": { ... } }` structure
5. **Windsurf** — new, uses `~/.codeium/windsurf/mcp_config.json`
6. **Other MCP-Compatible Agents** — keep existing generic fallback

**Move "Build from Source"** from Installation to Development section.

### 3. Official MCP Registry Metadata

Create `server.json` in the project root with:
- Schema: `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`
- Name: `io.github.energio-es/holded-mcp-server`
- Package type: npm, transport: stdio
- Environment variables: `HOLDED_API_KEY` (required), `HOLDED_MODULES` (optional), `HOLDED_RATE_LIMIT_PER_SECOND` (optional), `HOLDED_DEBUG` (optional)

### 4. npm Publication

- Build: `npm run build`
- Publish: `npm publish`
- Verify on npmjs.com

### 5. GitHub Release

- Create tag `v1.0.0` and GitHub release with notes from CHANGELOG.md
- Set repository topics: `mcp`, `mcp-server`, `holded`, `model-context-protocol`, `typescript`

### 6. MCP Registry Submissions

| Registry | Method | Automated? |
|---|---|---|
| Official MCP Registry | `mcp-publisher` CLI after npm publish | No — manual CLI |
| MCP Directory (FastMCP) | Web form at mcp.directory/submit | No — manual |
| MCP.SO | Web form at mcp.so/submit | No — manual |
| Glama.ai | "Add Server" at glama.ai/mcp/servers | No — manual |
| SkillsIndex | Web form at skillsindex.dev/submit | No — manual |
| OpenTools | Schedule call via Calendly | No — manual |

**Smithery** is skipped — requires Streamable HTTP transport, not compatible with stdio-only server.

## Out of Scope

- Adding HTTP/Streamable HTTP transport
- Blog posts or social media announcements
- Social preview images or OpenGraph metadata
- Removing internal docs (keeping full transparency)
- Cleaning up `.env.local` (properly gitignored, not committed)
