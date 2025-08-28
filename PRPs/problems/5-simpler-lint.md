# Prompt for Claude Code: Refactor lint strategy for speed + sanity (GitHub Actions + Node/TS)

You are an expert repo mechanic. Apply the following changes to this Node/TypeScript + Electron project that uses GitHub Actions. Make minimal, surgical edits. Produce a final PR (or patch) with all file diffs and a concise summary.

## Goals

- Separate **formatting (Prettier)** from **linting (ESLint)**.
- CI should **fail only on high-value rules** (correctness/safety). Style issues should not block.
- In CI, run ESLint and Prettier **only on changed files** for each PR/push.
- Auto-fix style/format at **pre-commit** to keep developers fast.
- Keep type checking and tests as they are.

---

## 1) Dev dependencies

Install/ensure these dev deps (update versions if already present):

- eslint, prettier, eslint-config-prettier
- eslint-plugin-import, eslint-plugin-unused-imports
- @typescript-eslint/parser, @typescript-eslint/eslint-plugin
- husky, lint-staged

> Command (for documentation; do not execute inside CI here):

```bash
npm i -D eslint prettier eslint-config-prettier \
eslint-plugin-import eslint-plugin-unused-imports \
@typescript-eslint/parser @typescript-eslint/eslint-plugin \
husky lint-staged
```

---

## 2) Root config files

Create/update **`.prettierrc`**:

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "arrowParens": "always"
}
```

Create/update **`.eslintignore`** to reduce noise:

```
dist
dist-*
build
out
coverage
node_modules
*.min.js
*.d.ts
**/generated/**
**/*.snap
```

Create/update **`.eslintrc.json`** so only high-value rules are errors; the rest are warnings; integrate with Prettier:

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": ["./tsconfig.json"]
  },
  "plugins": ["@typescript-eslint", "import", "unused-imports"],
  "extends": [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "settings": {
    "import/resolver": {
      "node": { "extensions": [".js", ".jsx", ".ts", ".tsx"] },
      "typescript": {}
    }
  },
  "rules": {
    /* --- High-value: fail CI --- */
    "no-unreachable": "error",
    "no-undef": "error",
    "eqeqeq": ["error", "smart"],
    "import/no-unresolved": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/no-throw-literal": "error",
    "@typescript-eslint/await-thenable": "error",

    /* --- Useful but non-blocking --- */
    "no-console": "warn",
    "no-return-await": "warn",
    "complexity": ["warn", 12],
    "max-lines-per-function": ["warn", 140],

    /* --- Cleanup (autofix + warn) --- */
    "unused-imports/no-unused-imports": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
    ]
  },
  "overrides": [
    {
      "files": ["**/*.test.*", "**/*.spec.*"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

---

## 3) `package.json` scripts and lint-staged

Update `package.json` to add/adjust scripts and `lint-staged`. Keep unrelated existing scripts intact.

```json
{
  "scripts": {
    "format": "prettier . --write",
    "format:check": "prettier . -c",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,yml,yaml,css,scss,html}": ["prettier --write"]
  }
}
```

Create **`.husky/pre-commit`** with executable bit and the following contents:

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

> Note: If Husky is not initialized, create the `.husky/` directory with a `_` bootstrap script accordingly, or run `npx husky init` locally after this PR is merged.

---

## 4) GitHub Actions: change `lint-and-typecheck` to run on changed files only

Edit `.github/workflows/ci.yml`. Replace the **entire** `lint-and-typecheck` job with:

```yaml
lint-and-typecheck:
  name: Lint & Type Check (changed files)
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Compute changed files
      id: changes
      shell: bash
      run: |
        if [ "${{ github.event_name }}" = "pull_request" ]; then
          BASE="origin/${{ github.base_ref }}"
        else
          BASE="${{ github.event.before }}"
          if [ -z "$BASE" ] || [ "$BASE" = "0000000000000000000000000000000000000000" ]; then
            BASE="$(git rev-list --max-parents=0 HEAD | tail -n1)"
          fi
        fi

        CHANGED_TS=$(git diff --name-only "$BASE"...HEAD | grep -E '\.(ts|tsx|js|jsx)$' || true)
        CHANGED_FORMAT=$(git diff --name-only "$BASE"...HEAD | grep -E '\.(ts|tsx|js|jsx|json|md|yml|yaml|css|scss|html)$' || true)

        echo "ts_files<<EOF" >> $GITHUB_OUTPUT
        echo "$CHANGED_TS" >> $GITHUB_OUTPUT
        echo "EOF" >> $GITHUB_OUTPUT
        echo "fmt_files<<EOF" >> $GITHUB_OUTPUT
        echo "$CHANGED_FORMAT" >> $GITHUB_OUTPUT
        echo "EOF" >> $GITHUB_OUTPUT

    - name: Run ESLint on changed files
      if: steps.changes.outputs.ts_files != ''
      run: |
        echo "Linting changed files:"
        echo "${{ steps.changes.outputs.ts_files }}"
        npx eslint ${{ steps.changes.outputs.ts_files }} --max-warnings 0

    - name: Check Prettier formatting on changed files
      if: steps.changes.outputs.fmt_files != ''
      run: npx prettier -c ${{ steps.changes.outputs.fmt_files }}

    - name: TypeScript type check (full project)
      run: npm run type-check
```

**Do not modify** other jobs (`test`, `build`, `security`, `analyze`, `ci-success`) except to keep compatibility.

---

## 5) Acceptance criteria

1. Commits that don’t change code files (`.ts/.tsx/.js/.jsx`) do **not** run ESLint or fail due to lint.
2. For code changes:
   - If only warnings remain, the **job passes**.
   - If any “error” rule is violated, the **job fails**.
3. Pre-commit hook auto-formats and auto-fixes most issues.
4. `npm run type-check` continues to run against the whole project and fails on real type errors.
5. Existing pipeline jobs still pass; build matrix unaffected.

---

## 6) Optional nice-to-haves (do not block this PR)

- Add `--cache` and `--cache-location .eslintcache` to local `lint`/`lint:fix` scripts for speed (omit from CI).
- Optionally add `import/order` as a `warn` to maintain consistent import grouping/order.

---

## Deliverables

- Updated files: `.eslintrc.json`, `.eslintignore`, `.prettierrc`, `package.json`, `.husky/pre-commit`, `.github/workflows/ci.yml`.
- A PR (or patch) with diffs and a short summary explaining:
  - High-value vs non-blocking rules policy.
  - How CI runs only on changed files.
  - How to ratchet rules over time (promote select warnings to errors in future sprints).
