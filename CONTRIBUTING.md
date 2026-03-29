# Contributing to Holded MCP Server

Thank you for your interest in contributing to Holded MCP Server! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 9
- Git

### Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/energio-es/holded-mcp-server.git
   cd holded-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Set up your Holded API key** (for testing):
   ```bash
   export HOLDED_API_KEY=your_api_key_here
   ```

## Development Workflow

### Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the code style guidelines below

3. **Build and test**:
   ```bash
   npm run build
   npm start  # Test the server
   ```

4. **Commit your changes** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new tool for X"
   git commit -m "fix: resolve issue with Y"
   git commit -m "docs: update README"
   ```

5. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

### TypeScript

- Use **2 spaces** for indentation
- Use **strict TypeScript** (already configured)
- Prefer **async/await** over Promise chains
- Use **Zod schemas** for all input validation
- Export types and interfaces from `types.ts` when shared

### Tool Implementation

- Each tool should have:
  - Clear description with examples
  - Proper Zod schema validation
  - Error handling with actionable messages
  - Support for both JSON and Markdown response formats
  - Appropriate annotations (readOnlyHint, destructiveHint, etc.)

### File Organization

- Tools grouped by domain in `src/tools/`
- Schemas in `src/schemas/`
- Shared utilities in `src/services/`
- Types in `src/types.ts`

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add holded_list_warehouses tool
fix: handle pagination edge case in list_contacts
docs: update installation instructions
```

## Pull Request Process

1. **Update CHANGELOG.md** with your changes under `[Unreleased]`
2. **Ensure your code builds** without errors
3. **Test your changes** with a real Holded API key (if applicable)
4. **Update documentation** if you've added new features or changed behavior
5. **Create a PR** with a clear description of what changed and why

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Changes are tested (manually or with tests)
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Commit messages follow conventional commits format

## Adding New Tools

When adding a new tool:

1. **Create the Zod schema** in the appropriate `src/schemas/` file
2. **Implement the tool** in the appropriate `src/tools/` file
3. **Register the tool** in the tool module's register function
4. **Update README.md** with the new tool in the "Available Tools" section
5. **Add examples** in the tool description

## Reporting Issues

Use GitHub Issues to report bugs or request features. Include:

- Clear description of the issue
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (Node version, OS)
- Holded API version if relevant

## Questions?

Feel free to open a GitHub Discussion for questions or start a conversation in an issue.

Thank you for contributing! 🎉
