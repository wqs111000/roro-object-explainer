# 可移植的双视图有声讲解

先认识外观和问题，再看内部部件，串起工作接力，最后一个观察问题。约一分钟是密度参考。角色问候可单独成段，之后建议停顿 0.8 秒，其余段落约 0.9 秒；末段不补静音。

本仓库不调用 TTS。使用当前环境支持且用户有权使用的音色，为每段文本生成 WAV；保存实际引擎、音色和参数。没有 TTS 时先完成稿件并明确未配音。不要要求使用者连接私有音色或私有地址。

所有段必须使用相同采样率、声道和 16-bit PCM WAV。拼接器根据真实帧数计时，停顿不算语音内容。改文字后重合成受影响的段，再重建整个时间轴。输入 `lesson-script.json` 示例：

```json
{
  "title": "它怎样工作？",
  "voice": "你实际使用的音色",
  "engine": "你实际使用的服务",
  "paragraph_gap": 0.9,
  "segments": [
    {"id": "outside", "view": "exterior", "part": null,
     "text": "先看看它的外面。", "caption": "看看外面", "wav": "audio/outside.wav", "pause_after": 0.8},
    {"id": "part-1", "view": "interior", "part": 1,
     "text": "这里是第一个小帮手。", "caption": "第一个小帮手", "wav": "audio/part-1.wav"}
  ]
}
```

用有真实双视图的卡片规格（含 `print_layout.exterior`）：

```sh
python <skill>/scripts/lesson_pipeline.py build --script drafts/item/lesson-script.json --card drafts/item/object-card.json --out drafts/item/lesson-v1
python <skill>/scripts/lesson_pipeline.py verify --out drafts/item/lesson-v1
```

WAV 路径相对讲解稿；图片路径相对卡片规格。输出双视图、拼接 WAV、`lesson.json`（含真实段落时间与部件）、`player.html` 和带 SHA-256 的 manifest。输出目录必须不存在，避免覆盖候选。播放器内嵌一份 WAV，增加文件体积，但可在不支持 HTTP Range 的普通静态服务器上回听跳段。`player.html` 可直接打开，也可在该目录运行 `python -m http.server 8000` 后打开 `http://localhost:8000/player.html`。服务器仅供本地预览。

播放器以音频当前位置作为时间源，提供播放/暂停、段落回听、进度、手动外观/内部切换、显示全部编号。后退隐藏未来编号，手动换图暂停，恢复播放回到音频对应视图。音频播放需要用户点击。开源播放器提供同步编号，不包含机制动画和视频导出；需要动画时在当前物品上单独设计落点，不用虚线补造不存在的连接。

实际检查配对图机位、结构、编号、音频发音和间隔、段落回听与后退显示。技术时间轴验证、浏览器交互和人耳试听分别记录。播放器不会宣称人耳已试听、内容已批准或已发布。
