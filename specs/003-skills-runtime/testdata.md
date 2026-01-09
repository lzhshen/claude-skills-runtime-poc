# 测试数据说明

**创建日期**: 2026-01-09
**关联规格**: [spec.md](./spec.md)

## 概述

本文档说明了用于验收测试的测试数据选择和使用方法。测试数据来源于 [anthropics/skills](https://github.com/anthropics/skills) 官方仓库。

## 测试数据位置

```
testdata/skills/
├── valid/                        # 有效的 skill 包
│   ├── brand-guidelines/         # 简单结构
│   └── slack-gif-creator/        # 复杂结构
└── invalid/                      # 无效的 skill 包
    ├── missing-skill-md/
    ├── missing-name/
    ├── missing-description/
    └── invalid-yaml/
```

## 选择的测试 Skill

### 1. brand-guidelines（主要测试用例）

**选择原因**:

| 特性 | 说明 |
|------|------|
| 结构简洁 | 仅包含 `SKILL.md` 和 `LICENSE.txt`，是"最小有效 skill"的基准 |
| YAML 完整 | 包含 `name`、`description`、`license` 三个字段 |
| 内容清晰 | Markdown 格式规范，有层次化标题和代码块 |
| 易于修改 | 内容简单，方便创建 badcase 变体 |

**文件结构**:
```
brand-guidelines/
├── SKILL.md      # 主技能文件 (包含品牌颜色、字体指南)
└── LICENSE.txt   # Apache 2.0 许可证
```

### 2. slack-gif-creator（复杂测试用例）

**选择原因**:

| 特性 | 说明 |
|------|------|
| 结构复杂 | 多层目录（core/）、多种文件类型 |
| 内容丰富 | Python 代码示例、Markdown、requirements.txt |
| 有依赖 | 包含 `requirements.txt` 测试依赖文件处理 |
| 可执行性 | 功能明确（创建 GIF），可测试执行流程 |

**文件结构**:
```
slack-gif-creator/
├── SKILL.md           # 主技能文件 (GIF 创建指南)
├── LICENSE.txt        # Apache 2.0 许可证
├── requirements.txt   # Python 依赖
└── core/              # 核心模块
    ├── __init__.py
    ├── easing.py          # 缓动函数
    ├── frame_composer.py  # 帧合成工具
    ├── gif_builder.py     # GIF 构建器
    └── validators.py      # 验证工具
```

## 验收场景覆盖矩阵

| 验收场景 | brand-guidelines | slack-gif-creator | Badcase |
|----------|:----------------:|:-----------------:|:-------:|
| **P1-1**: 有效技能包验证 | ✅ 主要 | ✅ 辅助 | - |
| **P1-2**: 缺少 SKILL.md | - | - | missing-skill-md |
| **P1-3**: 无效 YAML | - | - | missing-name, missing-description, invalid-yaml |
| **P1-4**: 无效 zip | - | - | 运行时生成 |
| **P2-1**: 目录树显示 | ✅ 简单 | ✅ 复杂 | - |
| **P2-2**: 语法高亮 | ✅ MD/YAML | ✅ MD/YAML/Python | - |
| **P2-3**: YAML 解析 | ✅ | ✅ | - |
| **P3-***: 编辑重打包 | ✅ 简单 | ✅ 复杂 | - |
| **P4-***: 运行技能 | ✅ | ✅ | - |
| **P5-***: 日志结果 | ✅ 简单 | ✅ 工具调用 | - |

## Badcase 设计

| ID | 目录名 | 修改内容 | 验证场景 |
|----|--------|----------|----------|
| BC-001 | missing-skill-md | 删除 SKILL.md，只保留 LICENSE.txt | P1 场景 2 |
| BC-002 | missing-name | SKILL.md 中删除 `name` 字段 | P1 场景 3 |
| BC-003 | missing-description | SKILL.md 中删除 `description` 字段 | P1 场景 3 |
| BC-004 | invalid-yaml | YAML 前置元数据语法错误 | P1 场景 3 |

## 使用方法

### 生成 ZIP 包

```bash
cd /home/shen/dev/claude-skills-runtime-poc/testdata/skills

# 有效包
cd valid && zip -r brand-guidelines.zip brand-guidelines/
cd valid && zip -r slack-gif-creator.zip slack-gif-creator/

# 无效包
cd invalid && zip -r missing-skill-md.zip missing-skill-md/
cd invalid && zip -r missing-name.zip missing-name/
cd invalid && zip -r missing-description.zip missing-description/
cd invalid && zip -r invalid-yaml.zip invalid-yaml/
```

### 在后端测试中使用

```python
from pathlib import Path

TESTDATA_DIR = Path(__file__).parent.parent.parent / "testdata" / "skills"

# 有效 skill
BRAND_GUIDELINES_DIR = TESTDATA_DIR / "valid" / "brand-guidelines"
SLACK_GIF_CREATOR_DIR = TESTDATA_DIR / "valid" / "slack-gif-creator"

# 无效 skill
MISSING_SKILL_MD_DIR = TESTDATA_DIR / "invalid" / "missing-skill-md"
MISSING_NAME_DIR = TESTDATA_DIR / "invalid" / "missing-name"
```

### 在前端测试中使用

```typescript
// 测试数据路径（相对于项目根目录）
const TESTDATA_PATH = '../../testdata/skills';
const VALID_SKILLS = `${TESTDATA_PATH}/valid`;
const INVALID_SKILLS = `${TESTDATA_PATH}/invalid`;
```

## 许可证

测试数据来自 [anthropics/skills](https://github.com/anthropics/skills) 仓库，遵循 Apache License 2.0。
