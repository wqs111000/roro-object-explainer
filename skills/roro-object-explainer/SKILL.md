---
name: roro-object-explainer
description: Create or revise children's illustrated how-it-works explainers for one object, using cutaway art, numbered components, printable cards, and optional paired exterior/interior views with synchronized narration. Use for mechanism cards and object explainers, not narrative storybooks.
---

# 图解绘本制作

每个作品解释一个具体类型的物品，回答一个核心问题。约四岁、中文短句、温暖纸张和彩铅、水彩质感是默认制作参数；尊重用户明确指定的年龄、风格和输出。不把一张原理图扩展为故事书。

本 skill 可独立运行，不要求 Story Studio、Roro 角色或私有服务。已有 Roro 项目继续使用项目内的角色规范和审核接口，见 [Story Studio 集成](references/story-studio.md)。不要用开源默认值覆盖项目选择。

## 选择交付模式

- 单张图片、打印卡、无声：静态模式，只运行卡片流程。
- 双视图有声图解：卡片流程加 [有声制作](references/digital-lesson.md)。未指定时，在有生图和合适 TTS 能力的环境中优先有声；缺少能力先完成图稿/讲解稿，明确剩余工作。不要把草稿或计划称作已完成生成。
- 只有本地工具：可编译提示词、校验素材、排版和拼接已有音频；本仓库不内置图像生成模型、TTS 服务、视频导出或发布服务器。

## 生产流程

1. 明确具体类型、一个问题和一条可见的因果链。通常 4–5 个部件，支持 3–6 个；使用专业名称配短用途。新机制或不确定事实读取官方/专业一手来源，记录 URL、支持的事实、简化限制，不能拿“示意”掩盖错误连接。
2. 复制 [规格模板](assets/card.example.json) 到工作区 `drafts/<object>/object-card.json`，规格是文字和标注的唯一编辑来源。默认不带人物；用户需要角色时填写 `character: {name, description}`，并提供角色身份参考。实际查看参考，再填写真实 SHA-256 和 `approved/reviewed: true`。模板中的来源只是占位，必须替换。
3. 运行 `node <skill>/scripts/card_pipeline.cjs plan --spec <json> --out <new-production-dir>`。将产出的实际 prompt 与 `reference_attachment_paths` 交给可用的生图工具，真正附图。保留 provider/model、实际 prompt、全部输入/输出路径与摘要。无法生图则交付计划并标注未生成。
4. 母版为无字全画幅场景：无编号、引线、箭头、标题空白、字幕条、边框或排版占位。双视图保持同一机位、比例和角色位置；优先由同一场景编辑外壳得到匹配外观。先看真实生成图，再填写各部件相对于内部图的 `target_box: [x,y,w,h]` 与 `badge: [x,y]`，全部为 0–1 坐标。不要从旧图复制位置。
5. 填写 `illustration.path/sha256` 后运行 `node <skill>/scripts/card_pipeline.cjs render --spec <json> --out <new-layout-dir>`。相对素材路径均相对规格文件。版式使用 contain，不裁切主体。长文先缩短内容。配对打印用 `print_layout: {mode: "a5-spread", exterior: {path, sha256}}`，输出两张 A5 和一张并排 A4；单图省略该字段。
6. 阅读 [视觉与内容标准](references/style-and-content.md)，批次只看一次联系表，放大有疑点的页。逐件记录 `accept`、`text-adapt` 或 `repair`；技术检查不等于视觉验收。结构和角色正确时，可小改非核心文字并同步讲解稿；错误机制、角色、危险动作或破损结构必须修图。文字/标注问题修排版，不重画母版。
7. 默认初稿后一次定向修订。第二次修订仅用于首轮已明确改善的具体阻塞缺陷；否则重构构图或报告未完成。复用未改图像的审核证据时必须匹配其摘要；任何规格、素材或成品改变均使原候选复核失效。
8. 参照 [审核记录](references/review.md) 创建真实记录并运行 `node <skill>/scripts/verify_review.cjs --manifest <layout>/manifest.json --review <layout>/visual-review.json`。校验通过只表示证据完整且未过期；默认仍为候选。审核者不得由脚本生成虚假通过记录，发布需要用户在相应系统中的明确动作。

## 输出与依赖

Node.js 20+ 与 sharp 用于卡片排版；有声拼接另需 Python 3.10+（仅标准库）。本 skill 目录的 `package.json` 允许复制后独立 `npm install`；也可在开源仓库根目录安装依赖。`RORO_SHARP_MODULE` 是可选模块路径覆盖，不依赖某台电脑的 bundled runtime。

保留规格、来源、参考与母版摘要、实际生图记录、独立 SVG 排版层、PNG 预览、manifest 和复核证据。默认输出 A4 横版 3508×2480、300 dpi；上采样不代表母版原生细节分辨率。成品中文需要系统安装可用的中文字体（例如 Noto Sans CJK SC）；字体不随仓库分发。

所有中间和成品写入 `drafts/` 的新版本目录。图片生成、TTS 调用遵循当前环境与用户授权。内容复核、用户试听、内容批准和外部发布是独立状态；不要把其中任何一项推断成其他项。
