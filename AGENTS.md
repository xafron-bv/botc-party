## AI Instructions

1. Start local server (from repo root):

```bash
# Run in background on port 8080 and store PID (recommended for agents)
./server.sh
```

2. Before committing changes, always run the tests and ESLint fix:

```bash
# Run tests (headless)
# Full suite (starts a server on 5173, runs Cypress, then stops server)
./test.sh

# Single spec example
./test.sh tests/09_player_context_menu.cy.js

# Fix lint issues
npx eslint --fix
```

3. Test-Driven Development (TDD)

- Start each feature or bugfix by writing a failing Cypress test that defines the behavior.
- Implement the minimal changes to make the test pass, then refactor if needed.

4. Conventional Commits (< 80 chars)

- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `refactor:`).
- Keep the subject line strictly under 80 characters.

5. Require Green Tests Before Commit/Push

- Always run the full Cypress suite before committing or pushing.
- If any tests fail, fix the code or tests, then re-run until all pass.
- Do not commit/push with failing tests.

6. Static Imports Only

- Do not use dynamic `require`/`import()` within functions or blocks.
- Always place all imports at the top of the module.
