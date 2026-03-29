# Security Policy

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

If you discover a security vulnerability in this project, please report it privately:

1. **Email**: Send details to the maintainers via [GitHub Security Advisories](https://github.com/energio-es/holded-mcp-server/security/advisories/new)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Any suggested fixes (optional)

## What to Expect

- **Acknowledgment**: Within 72 hours of your report
- **Updates**: We will keep you informed of our progress
- **Resolution**: We aim to release a fix as soon as possible, depending on severity
- **Credit**: You will be credited in the security advisory (unless you prefer otherwise)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices for Users

When using this MCP server:

1. **Protect your API key**: Never commit your `HOLDED_API_KEY` to version control
2. **Use `.env.local`**: Store secrets in `.env.local` which is gitignored
3. **Rotate keys regularly**: Periodically regenerate your API key at https://app.holded.com/api
4. **Limit module access**: Only enable the modules you need via `HOLDED_MODULES`
5. **Review permissions**: Ensure your API key has only the permissions required

## Disclosure Policy

We follow a coordinated disclosure process:

1. Security issues are fixed in a private branch
2. A security advisory is drafted
3. The fix is released
4. The advisory is published with details and credits

Thank you for helping keep this project and its users secure.
