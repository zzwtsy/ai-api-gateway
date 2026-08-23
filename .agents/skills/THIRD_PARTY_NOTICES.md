# Third-Party Notices for Agent Skills

部分工作流参考或改写自 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，整理时核对的上游 Commit 为：

```text
b150a551b8d465e31e418e1b2eaf5e79bbb7d28e
```

参考的上游 Skill：

- `.agents/skills/dsh-code-review/`
- `.agents/skills/dsh-doc-standards/`
- `.agents/skills/dsh-prose-standard/`
- `.agents/skills/dsh-trim-cot-leakage/`
- `.agents/skills/dsh-pre-push-checks/`
- `.agents/skills/dsh-find-simplifications/`
- `.agents/skills/record-browser-gif/`

`record-ui-evidence/scripts/encode_gif.py` 是上游编码脚本的本地化衍生版本。其余 Skill 已围绕 AI API Gateway 的中文事实来源、协议透明性、Request/Attempt、Secret、Playwright Mock Provider 和项目 Gate 体系重写。

## DeepSeek Harness MIT License

MIT License

Copyright (c) 2026 DeepSeek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
