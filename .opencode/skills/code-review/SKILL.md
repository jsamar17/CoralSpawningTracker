---
name: code-review
description: Use before every commit to review staged Python changes for PEP 8 compliance, code readability, maintainability, and test coverage. Triggered by user saying "review", "commit", or before any git commit.
---

# Code Review Skill

Review all staged Python changes before committing. Apply these checks in order. Fix issues directly — do not just report them.

## 1. PEP 8 Compliance

Run on all staged `.py` files:

```bash
python3 -m pycodestyle --max-line-length=120 <files>
```

If `pycodestyle` is not installed, install it first:

```bash
pip install pycodestyle
```

Fix violations for:
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE` for constants
- **Imports**: one per line, grouped (stdlib, third-party, local), sorted alphabetically
- **Whitespace**: 4-space indentation, two blank lines before top-level definitions, one blank line between methods
- **Line length**: max 120 chars (soft limit)
- **Quotes**: consistent single or double (match existing code in the file)

## 2. Code Quality

Review changed code for:

- **Functions**: single responsibility, no function exceeds ~40 lines
- **Naming**: descriptive names that reveal intent (no `x`, `tmp`, `data` without context)
- **Docstrings**: present on all public functions and classes, concise
- **Error handling**: no bare `except:`, log or re-raise meaningful exceptions
- **DRY**: no duplicated logic — extract to a function if repeated
- **Magic values**: named constants instead of inline numbers/strings
- **Type hints**: include on function signatures where they improve clarity

## 3. Test Coverage

For any new or modified function, verify a corresponding test exists in `tests/`. If missing:

1. Create or update `tests/test_<module>.py`
2. Test the happy path, edge cases, and error cases
3. Use `setup_function()` to call `clear_user_data()` or equivalent reset
4. Run `python3 -m pytest tests/ -v` and confirm all pass

Minimum coverage: every public function in `services/` and `routes.py` must have at least one test.

## 4. Commit Readiness

Before confirming the review is complete:

1. Run `python3 -m pycodestyle --max-line-length=120` on changed files
2. Run `python3 -m pytest tests/ -v` and confirm all pass
3. Summarize: files changed, issues found and fixed, test results
4. Suggest the commit message in the repo's style (imperative mood, `Closes #N`)
