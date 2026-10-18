# 可选 Story Studio 集成

上游：[Roro Story Studio](https://github.com/wqs111000/roro-story-studio)。独立版不包含上游服务和私人角色/音色。

在已有 Studio 中应使用其项目内 `skills/roro-object-explainer/SKILL.md`：它维护自己的字段契约、最新角色参考、音频渲染和候选审核。本独立版的 `character_identity`、独立音频 manifest 与 Studio 字段并非直接兼容，不要直接复制进发布目录。

迁入 Studio 需通过其适配器：将打印卡、母版、双视图、旁白与时间轴映射为当前 `object-card.json`、`lesson.json`，按母版真实尺寸转换坐标；执行其候选准备脚本，让当前候选摘要与视觉/讲解复核匹配。项目默认使用暖阳 Roro，参考来自项目已批准注册表，不随开源版分发。

Studio 工作台先预览当前候选，随后用户明确“通过并上架”才生成不可变 release。制作完成不自动部署、同步私人站点或导出外部内容库。监听、手机可达、服务响应与人耳试听分别记录。
