# Test Data - Claude Skills Runtime

本目录包含用于测试 Claude Skills 运行时框架的测试数据。

## 目录结构

```
testdata/
└── skills/
    ├── valid/                        # 有效的 skill 包
    │   ├── brand-guidelines/         # 简单结构的有效 skill
    │   │   ├── SKILL.md
    │   │   └── LICENSE.txt
    │   └── slack-gif-creator/        # 复杂结构的有效 skill
    │       ├── SKILL.md
    │       ├── LICENSE.txt
    │       ├── requirements.txt
    │       └── core/
    │           ├── __init__.py
    │           ├── easing.py
    │           ├── frame_composer.py
    │           ├── gif_builder.py
    │           └── validators.py
    └── invalid/                      # 无效的 skill 包（用于测试错误处理）
        ├── missing-skill-md/         # 缺少 SKILL.md 文件
        │   └── LICENSE.txt
        ├── missing-name/             # YAML 缺少 name 字段
        │   └── SKILL.md
        ├── missing-description/      # YAML 缺少 description 字段
        │   └── SKILL.md
        └── invalid-yaml/             # YAML 语法错误
            └── SKILL.md
```

## 测试用例说明

### 有效 Skill 包

#### 1. brand-guidelines（简单结构）

**来源**: [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/brand-guidelines)

**选择原因**:
- 最小有效结构：仅包含 `SKILL.md` 和 `LICENSE.txt`
- 规范的 YAML 前置元数据：完整包含 `name`、`description`、`license` 字段
- 清晰的 Markdown 结构：分层标题、代码块，适合测试语法高亮

**测试覆盖**:
- P1: 有效技能包验证
- P2: 简单目录树显示、YAML 解析
- P3: 基本编辑和重打包

#### 2. slack-gif-creator（复杂结构）

**来源**: [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/slack-gif-creator)

**选择原因**:
- 丰富的目录结构：多层级目录、多种文件类型
- 内容多样性：Python 代码、Markdown、YAML、requirements.txt
- 代表性强：代表"生产级 skill"的典型结构

**测试覆盖**:
- P1: 复杂技能包验证
- P2: 多级目录树、多种语法高亮（MD/YAML/Python）
- P3: 复杂编辑和重打包
- P4/P5: 可执行性测试

### 无效 Skill 包（Badcases）

| ID | 目录名 | 问题描述 | 对应验收场景 |
|----|--------|----------|-------------|
| BC-001 | missing-skill-md | 缺少 SKILL.md 文件 | P1 场景 2 |
| BC-002 | missing-name | YAML 缺少 `name` 字段 | P1 场景 3 |
| BC-003 | missing-description | YAML 缺少 `description` 字段 | P1 场景 3 |
| BC-004 | invalid-yaml | YAML 语法格式错误 | P1 场景 3 |

## 使用方法

### 生成测试用 ZIP 包

```bash
# 生成有效的 skill 包
cd testdata/skills/valid
zip -r brand-guidelines.zip brand-guidelines/
zip -r slack-gif-creator.zip slack-gif-creator/

# 生成无效的 skill 包
cd testdata/skills/invalid
zip -r missing-skill-md.zip missing-skill-md/
zip -r missing-name.zip missing-name/
zip -r missing-description.zip missing-description/
zip -r invalid-yaml.zip invalid-yaml/
```

### 在测试中使用

```python
# Python 测试示例
import os
from pathlib import Path

TESTDATA_DIR = Path(__file__).parent.parent / "testdata" / "skills"
VALID_SKILLS_DIR = TESTDATA_DIR / "valid"
INVALID_SKILLS_DIR = TESTDATA_DIR / "invalid"

def test_valid_skill_upload():
    skill_path = VALID_SKILLS_DIR / "brand-guidelines"
    # ... 测试逻辑

def test_missing_skill_md():
    skill_path = INVALID_SKILLS_DIR / "missing-skill-md"
    # ... 测试逻辑
```

## 许可证

测试数据中的 skill 文件来自 [anthropics/skills](https://github.com/anthropics/skills) 仓库，
遵循 Apache License 2.0 许可证。
