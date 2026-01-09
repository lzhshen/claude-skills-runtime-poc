---
name invalid-yaml-test
description This YAML has syntax errors - missing colons after field names
license: Complete terms in LICENSE.txt
---

# Invalid YAML Test Case

This SKILL.md file has intentionally malformed YAML frontmatter.

## Purpose

This file is used to test the validation error handling when a skill package
is uploaded with invalid YAML syntax in the frontmatter.

## Expected Behavior

The validator should:
1. Detect that the YAML frontmatter cannot be parsed
2. Return a clear error message about the YAML syntax error
3. Suggest how to fix the issue
