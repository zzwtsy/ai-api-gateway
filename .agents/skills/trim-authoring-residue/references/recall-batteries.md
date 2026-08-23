# 作者过程残留召回探针

这些命令只用于提高召回率，不定义缺陷。每个命中都必须结合文档类型、代码语义和当前拥有者人工判断。探针会命中本 Skill 自己的规则与示例；审查业务范围时排除该目录，或把这些命中标记为校准语料。

## 通用排除

```bash
COMMON=(
  --hidden -n
  --glob '!node_modules/**'
  --glob '!.git/**'
  --glob '!dist/**'
  --glob '!coverage/**'
  --glob '!.artifacts/**'
  --glob '!apps/web/src/routeTree.gen.ts'
  --glob '!apps/web/src/api/schema.d.ts'
  --glob '!.agents/skills/trim-authoring-residue/**'
)
```

在不支持 Bash 数组的环境中，把这些 `--glob` 逐项写入命令。

## PR、评审和设计会话视角

```bash
rg "${COMMON[@]}" -i \
  '(这个 PR|本 PR|本次修改|这一轮|上一轮|后续 PR|前一个 commit|previous commit|this PR|later PR|reviewer|评审(认为|要求|确认|拒绝)|设计稿|设计会话|审计项|audit [A-Z][0-9]+|decision [0-9]+|计划 §|design §)' \
  .
```

## 变更叙述和版本时间戳

```bash
rg "${COMMON[@]}" -i \
  '(以前|之前|旧版|老版本|不再|现在改为|目前这版|这一版|本版|本轮|used to|no longer|previously|old version|this cut|for now|at the moment)' \
  .
```

注意：Postmortem、Decision 和运行时 old/new 状态可能是合法命中。

## 含糊计划和缓和语

```bash
rg "${COMMON[@]}" -i \
  '(暂时够用|以后再说|后面再做|大概没问题|应该足够|可能需要|视情况|probably fine|should be enough|maybe later|eventually|for the time being)' \
  .
```

命中后判断是否应改成精确边界、活动 Plan、Issue，或有所有者的 `TODO`/`FIXME`。

## 控制流和测试讲解

```bash
rg "${COMMON[@]}" -i \
  '(先.{0,30}然后|首先.{0,30}接着|最后我们|这个测试先|点击.{0,30}然后|first we|then we|finally we|this test first)' \
  --glob '*.md' --glob '*.ts' --glob '*.tsx' --glob '*.mjs' \
  .
```

顺序本身是合同且不可交换时保留事实，但改写为“必须先 A 再 B，否则 C”。

## 自我辩护

```bash
rg "${COMMON[@]}" -i \
  '(这里(是|很)?安全|这个强转(是)?安全|显然正确|不会出错|这是正确的因为|safe because|this cast is safe|obviously correct|cannot fail)' \
  --glob '*.md' --glob '*.ts' --glob '*.tsx' --glob '*.mjs' \
  .
```

需要的不是“安全”结论，而是唯一构造者、验证点、所有权或不变量。

## 不可解析的内部编号

```bash
rg "${COMMON[@]}" \
  '(\b[PTW]-?[0-9]+\b|\b[A-Z][0-9]+\b|§[0-9]+(?:\.[0-9]+)*)' \
  --glob '*.md' --glob '*.ts' --glob '*.tsx' --glob '*.mjs' \
  .
```

该探针误报很多：HTTP 状态、Error Code、RFC 章节、正式文档锚点和测试 ID 都可能合法。只处理不能从当前仓库或公开标准解析的作者内部编号。

## 精确短语复查

每发现一种新的残留表达，用其最有辨识度的 3 至 8 个词重新搜索整个请求范围，检查同类段落。不要把新短语永久加入探针，除非它代表稳定缺陷类别而不是一次性措辞。
