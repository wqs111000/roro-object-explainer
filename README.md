# Roro Object Explainer · 图解绘本 Skill

把“它为什么会这样工作？”做成儿童能看懂的原理图解：无字插画母版、独立编号与说明、可打印卡片，以及可选的双视图有声讲解。

来自 [Roro Story Studio](https://github.com/wqs111000/roro-story-studio) 的实际制作流程，抽离成可移植的 skill。**v0.1.0：制作规范经过作品使用；独立工具包是首次公开版本，仍需要更多跨环境反馈。**

## 能做什么

| 能力 | 当前交付 |
| --- | --- |
| 选题、机制核实、儿童短文、参考绑定、生图提示词 | Skill 指导 + plan 命令 |
| 静态排版、编号位置/碰撞检查 | PNG / SVG / manifest |
| 双视图打印 | A4 横版 + 两张 A5 竖页，300 dpi |
| 有声讲解 | 已有分段 WAV → 拼接 WAV、真实时间轴、离线播放器 |
| 视觉复核 | 人或创作代理实际看图，校验器检测过期文件与证据 |
| 生成插画 / 合成声音 | 由当前 AI 客户端、图像工具、TTS 提供，不内置模型或账户 |
| 机制动画、视频、工作台上架 | 完整 Studio 的可选集成，不包含在此独立包 |

不要求 Roro 角色。可用自己的角色，或不带人物；私人角色图、家庭资料和音色不在仓库内。

## 快速开始

需要 Node.js 20+；配音拼接需 Python 3.10+。排版需要系统中文字体，例如 Noto Sans CJK SC / 思源黑体，或 Windows 的 Microsoft YaHei；字体不随仓库提供。

```sh
git clone https://github.com/wqs111000/roro-object-explainer.git
cd roro-object-explainer
npm ci
npm test
npm run demo
```

`npm run demo` 在 `drafts/demo-*` 生成一份**工具自检示意**、卡片预览和短音频播放器，用于确认工具可运行。它没有调用 AI，也不是儿童内容质量或中文字体的验收样本。

## 作为 Skill 使用

将 `skills/roro-object-explainer/` 整个目录复制到客户端的 skill 目录；例如 Codex 的 `~/.codex/skills/`（Windows 为 `%USERPROFILE%\.codex\skills\`）。在复制后的 skill 目录执行 `npm install`，使 sharp 随 skill 独立可用。若已有同名项目 skill，请先比较，避免覆盖项目专用版本。

也可直接让支持读文件的创作代理读取本仓库的 `skills/roro-object-explainer/SKILL.md`，在项目中使用。不支持 skill 自动发现的客户端可把入口作为任务说明。

示例请求：

> 使用 $roro-object-explainer 制作“洗衣机里的水去了哪里？”图解绘本。解释家用滚筒洗衣机的进水和排水，先完成候选与视觉复核。

> 制作一张自行车链条怎样带动车轮的静态图解，不带角色，不要音频。

## 手动运行

复制 `skills/roro-object-explainer/assets/card.example.json` 到 `drafts/my-object/`。模板中的图像、坐标、摘要和来源必须按实际作品填写；它不是可直接渲染的假成品。

```sh
node skills/roro-object-explainer/scripts/card_pipeline.cjs plan --spec drafts/my-object/object-card.json --out drafts/my-object/production-v1
# 用自己的图像工具完成母版，查看后补齐真实 SHA-256 与坐标
node skills/roro-object-explainer/scripts/card_pipeline.cjs render --spec drafts/my-object/object-card.json --out drafts/my-object/layout-v1
```

完整流程见 [SKILL.md](skills/roro-object-explainer/SKILL.md)，声音与播放器见 [有声制作](skills/roro-object-explainer/references/digital-lesson.md)，审核见 [复核格式](skills/roro-object-explainer/references/review.md)。相对素材路径以所属 JSON 所在目录为基准。

## 质量与反馈

生成成功、像素尺寸正确、校验通过、视觉正确、人耳试听、用户批准和发布分别记录。默认是候选，不自动上架。修改母版、参考、文字、排版或声音后，重新生成相应版本并复核。

CI 在 Windows / Linux、Node 20 / 22 上运行静态与音频工具测试。尚未在所有 AI 客户端完成实际生图验证。欢迎用不含私人信息的最小规格、命令与错误输出提交 issue；不要上传密钥、家庭照片、儿童录音或私人候选包。

## 许可证

代码、文档和自行编写的测试示例采用 [Apache-2.0](LICENSE)，来源与修改见 [NOTICE](NOTICE)。许可证不授予 Roro 商标或私人角色、声音和媒体的使用权。你提供的参考、字体、模型、声音和生成内容遵循各自的权利与服务条款。
