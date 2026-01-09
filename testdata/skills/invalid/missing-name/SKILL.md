---
description: This skill is missing the required 'name' field in the YAML frontmatter.
license: Complete terms in LICENSE.txt
---

# Missing Name Field Test Case

This SKILL.md file is intentionally missing the `name` field in the YAML frontmatter.

## Purpose

This file is used to test the validation error handling when a skill package
is uploaded without the required `name` field.

## Expected Behavior

The validator should:
1. Detect that the `name` field is missing
2. Return a clear error message indicating which field is missing
3. Suggest how to fix the issue
