# Project Governance

## Vision

The **Holded MCP Server** aims to provide a reliable, comprehensive, and easy-to-use bridge between AI assistants and the Holded business management platform. Our goal is to enable businesses to automate their workflows and interact with their data using natural language through the Model Context Protocol.

### Scope

**In Scope:**
- Full coverage of the official Holded REST API
- Tools that strictly map to Holded API endpoints
- Type safety and validation matching Holded's data structures
- Documentation and examples for using these tools with LLMs

**Out of Scope:**
- Custom business logic or workflows specific to one company
- Integrations with other ERPs or third-party services (unless directly related to Holded)
- UI components or frontend applications
- "Hack" solutions that rely on undocumented APIs

## Decision Making

### Maintainers

The project is maintained by the Energio team. Maintainers are responsible for:
- Reviewing and merging Pull Requests
- Triaging issues and bug reports
- Releasing new versions
- Enforcing the Code of Conduct

**Current Maintainers:**
- Energio Engineering Team

### Contributing Process

1. **Issues**: Anyone can open an issue to report bugs or request features.
2. **Discussions**: Major changes should be discussed in GitHub Discussions or an Issue before implementation.
3. **Pull Requests**:
   - PRs require at least one approval from a maintainer to be merged.
   - PRs must pass all CI checks (linting, build).
   - Breaking changes require careful consideration and may be deferred to major version updates.

### Release Cadence

- **Patch Releases**: Released as needed for bug fixes.
- **Minor Releases**: Released when new features or tools are added (backward compatible).
- **Major Releases**: Reserved for breaking changes to the tool schemas or configuration.

## Support

This project is community-supported. While we use it in production at Energio and are committed to its maintenance, we cannot guarantee immediate support for all issues.

For commercial support or custom development, please contact Energio directly.
