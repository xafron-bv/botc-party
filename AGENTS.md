## AI Instructions

1. Before committing changes, always run the tests and ESLint fix:

```bash
# Run tests in parallel (FAST - recommended for full suite)
./test-parallel.sh

# Run specific specs in parallel
./test-parallel.sh tests/09_player_context_menu.cy.js tests/01_scripts.cy.js

# Run single spec (for debugging with console output)
./test.sh tests/09_player_context_menu.cy.js

# Fix lint issues
npx eslint --fix
```

2. Test-Driven Development (TDD)

- Start each feature or bugfix by writing a failing Cypress test that defines the behavior.
- Implement the minimal changes to make the test pass, then refactor if needed.

3. Conventional Commits (< 80 chars)

- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `refactor:`).
- Keep the subject line strictly under 80 characters.

4. Require Green Tests Before Commit/Push

- Always run the full Cypress suite (`./test-parallel.sh`) before committing or pushing.
- Use `./test-parallel.sh` for fast parallel execution of the full suite.
- Use `./test.sh <spec>` when debugging individual tests.
- If any tests fail, fix the code or tests, then re-run until all pass.
- Do not commit/push with failing tests.

5. Static Imports Only

- Do not use dynamic `require`/`import()` within functions or blocks.
- Always place all imports at the top of the module.
