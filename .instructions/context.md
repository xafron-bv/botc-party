# Project Context and Guidelines

## Pre-Commit Requirements

**IMPORTANT**: Before committing any changes, you MUST:

1. **Run ESLint with --fix flag**:
   ```bash
   npx eslint . --fix
   ```
   This will automatically fix any fixable linting issues and report any remaining errors.

2. **Run the test suite** (requires starting a local server):
   ```bash
   # Start the http-server and run all tests
   npx http-server -p 5173 -c- . & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx cypress run --config-file tests/cypress.config.js ; kill %1
   
   # Or run specific test files if you only modified certain features
   npx http-server -p 5173 -c- . & CYPRESS_BASE_URL=http://127.0.0.1:5173 npx cypress run --config-file tests/cypress.config.js --spec tests/[specific-test-file].cy.js ; kill %1
   ```
   
   Note: The commands above will:
   - Start an http-server on port 5173 in the background
   - Run the Cypress tests against that server
   - Automatically stop the server when tests complete

3. **Only commit if both ESLint and tests pass**. If there are any failures:
   - Fix the ESLint errors first
   - Fix any failing tests
   - Re-run both ESLint and tests to confirm everything passes

## Development Workflow

The recommended workflow is:
1. Make your changes
2. Run `npx eslint . --fix` to auto-fix and check for linting issues
3. Fix any remaining ESLint errors manually
4. Run the relevant tests to ensure nothing is broken
5. Only then create your commit

## Testing Guidelines

- The project uses Cypress for E2E testing
- Tests are located in the `tests/` directory
- When adding new features, consider adding corresponding tests
- When modifying existing features, ensure the related tests still pass

## Code Quality

- The project uses ESLint for code quality enforcement
- Follow the existing code style and patterns
- Keep functions pure when possible (as noted in user rules)
- Minimize changes - only modify what's necessary for the requested feature