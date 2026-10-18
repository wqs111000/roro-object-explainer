# 绑定当前成品的复核

渲染器记录 `state: awaiting_visual_review`，不会自动批准作品。技术检查不能证明角色正确、标号落点或儿童能懂。

实际看过当前打印图和预览后，由审核者创建 `visual-review.json`：

```json
{
  "package_digest": "从当前 manifest 复制",
  "reviewer": "实际检查者",
  "verdict": "accept",
  "checks": {
    "style": {"status": "accept", "reason": "记录具体观察"},
    "character_identity": {"status": "not_applicable", "reason": "本卡没有角色"},
    "mechanism": {"status": "accept", "reason": "记录关键连接和来源支持"},
    "number_placement": {"status": "accept", "reason": "逐号检查目标位置"},
    "number_text_matching": {"status": "accept", "reason": "逐号核对名称与用途"},
    "readability": {"status": "accept", "reason": "检查中文缺字、字号与重叠"},
    "no_occlusion": {"status": "accept", "reason": "主体与关键接点完整"}
  }
}
```

以上是结构示例，不能直接当成实际验收记录。`repair`、未检查或 `text-adapt` 均不能通过发布前校验；完成修改后重新渲染和复核。

校验器重新计算规格、参考、母版、所有列出的输出以及 package digest，拒绝过期记录和越出输出目录的 artifact 路径。它无法判断审核文字是否真实，也不签名或授权发布。候选不自动变成批准状态。

有声包的 `manifest.json` 独立绑定双视图、WAV、时间轴、讲解稿和播放器。试听、机制动画落点和播放器交互应另存复核，不能把静态卡的 `accept` 直接用于声音。当前静态校验器只接受卡片 manifest；有声包用 `lesson_pipeline.py verify --out <dir>` 校验文件完整性，人工记录视觉/试听结果。
