#!/usr/bin/env python3
"""SPDX-License-Identifier: Apache-2.0. Assemble existing PCM WAV segments; no TTS calls."""
import argparse
import base64
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import wave


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def require(ok, message):
    if not ok:
        raise ValueError(message)


def seconds(value):
    require(isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and 0 <= value <= 30,
            'Pause must be a finite number from 0 to 30 seconds')
    return value


def asset(base, record):
    path = (base / record['path']).resolve()
    require(digest(path.read_bytes()) == record['sha256'], 'Stale image: ' + path.name)
    require(path.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'), 'Use a PNG, JPEG or WebP image')
    return path


def build(script_path, card_path, out):
    require(not out.exists(), 'Output exists; choose a new revision directory')
    script, card = read_json(script_path), read_json(card_path)
    segments = script.get('segments')
    require(isinstance(segments, list) and 0 < len(segments) <= 100, 'Use 1-100 segments')
    require(isinstance(card.get('parts'), list) and 3 <= len(card['parts']) <= 6, 'Use 3-6 card parts')
    parts = card['parts']
    for part in parts:
        b = part.get('badge')
        require(isinstance(b, list) and len(b) == 2 and all(isinstance(v, (int, float)) and math.isfinite(v) and 0 <= v <= 1 for v in b), 'Invalid badge coordinates')
    internal = asset(card_path.parent, card['illustration'])
    external = asset(card_path.parent, card['print_layout']['exterior'])
    ids, chunks, timeline, frame, fmt = set(), [], [], 0, None
    gap = seconds(script.get('paragraph_gap', 0.9))
    for i, segment in enumerate(segments):
        sid = segment.get('id', '')
        require(isinstance(sid, str) and re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}', sid) and sid not in ids, 'Segment IDs must be unique and filename-safe')
        ids.add(sid)
        require(segment.get('view') in ('exterior', 'interior'), 'Invalid view')
        part = segment.get('part')
        require(part is None or (type(part) is int and 1 <= part <= len(parts)), 'Unknown part number')
        require(part is None or segment['view'] == 'interior', 'Numbered parts require the interior view')
        for key in ('text', 'caption'):
            require(isinstance(segment.get(key), str) and segment[key].strip(), 'Nonempty ' + key + ' required')
        wav_path = (script_path.parent / segment['wav']).resolve()
        with wave.open(str(wav_path), 'rb') as wav:
            current = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate())
            require(wav.getcomptype() == 'NONE' and current[1] == 2 and current[0] in (1, 2) and current[2] > 0,
                    'Use mono/stereo 16-bit PCM WAV')
            require(fmt is None or fmt == current, 'WAV sample rate/channels must match')
            fmt = current
            count = wav.getnframes()
            data = wav.readframes(count)
            require(count > 0 and len(data) == count * fmt[0] * fmt[1], 'Empty or truncated WAV')
        rate = fmt[2]
        timeline.append({k: segment.get(k) for k in ('id', 'view', 'part', 'text', 'caption')})
        timeline[-1].update(start=frame / rate, end=(frame + count) / rate,
                            duration=count / rate, wav_sha256=digest(wav_path.read_bytes()))
        chunks.append(data)
        frame += count
        pause = round(seconds(segment.get('pause_after', gap)) * rate) if i < len(segments) - 1 else 0
        chunks.append(bytes(pause * fmt[0] * fmt[1]))
        frame += pause
    out.mkdir(parents=True)
    views = {}
    for view, source in (('exterior', external), ('interior', internal)):
        name = view + source.suffix.lower()
        shutil.copyfile(source, out / name)
        views[view] = name
    with wave.open(str(out / 'lesson.wav'), 'wb') as wav:
        wav.setnchannels(fmt[0])
        wav.setsampwidth(fmt[1])
        wav.setframerate(fmt[2])
        for chunk in chunks:
            wav.writeframesraw(chunk)
    lesson = dict(schema_version=1, title=script['title'], views=views, audio='lesson.wav',
                  voice=script.get('voice'), engine=script.get('engine'), parts=parts,
                  duration=frame / fmt[2], segments=timeline, user_listening='pending', publication='not_published')
    write_json(out / 'lesson.json', lesson)
    # Preserve input bytes as evidence; player uses only portable copied assets.
    shutil.copyfile(script_path, out / 'lesson-script.json')
    shutil.copyfile(card_path, out / 'object-card.json')
    template = Path(__file__).with_name('player.template.html').read_text(encoding='utf-8')
    payload = json.dumps(lesson, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    # Embedded audio supports seeking from file:// and static servers without HTTP Range.
    audio_data = json.dumps('data:audio/wav;base64,' + base64.b64encode((out / 'lesson.wav').read_bytes()).decode('ascii'))
    (out / 'player.html').write_text(template.replace('/*LESSON_DATA*/', payload).replace('/*AUDIO_DATA*/', audio_data), encoding='utf-8')
    artifacts = [dict(path=p.name, sha256=digest(p.read_bytes())) for p in sorted(out.iterdir())]
    write_json(out / 'manifest.json', dict(schema_version=1, kind='standalone-audio-lesson', artifacts=artifacts,
                                         package_digest=digest(json.dumps(artifacts, sort_keys=True).encode()),
                                         visual_review='not_checked', user_listening='pending', publication='not_published'))
    return dict(output=str(out), duration=lesson['duration'], user_listening='pending')


def verify(out):
    manifest = read_json(out / 'manifest.json')
    require(manifest.get('kind') == 'standalone-audio-lesson', 'Unsupported lesson manifest')
    items = manifest['artifacts']
    require(digest(json.dumps(items, sort_keys=True).encode()) == manifest['package_digest'], 'Invalid package digest')
    seen = set()
    for record in items:
        relative = Path(record['path'])
        target = (out / relative).resolve()
        require(not relative.is_absolute() and target.is_relative_to(out.resolve()) and target != out.resolve(), 'Artifact outside package')
        require(record['path'] not in seen, 'Duplicate artifact')
        seen.add(record['path'])
        require(digest(target.read_bytes()) == record['sha256'], 'Stale artifact: ' + str(relative))
    require({'player.html', 'lesson.json', 'lesson.wav', 'object-card.json', 'lesson-script.json'} <= seen, 'Incomplete lesson')
    lesson = read_json(out / 'lesson.json')
    require(set(lesson['views'].values()) <= seen, 'Missing view assets')
    with wave.open(str(out / 'lesson.wav'), 'rb') as wav:
        require(lesson['duration'] == wav.getnframes() / wav.getframerate(), 'Incorrect audio duration')
    return dict(integrity='pass', visual_review=manifest['visual_review'], user_listening=manifest['user_listening'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('build', 'verify'))
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--script', type=Path)
    parser.add_argument('--card', type=Path)
    args = parser.parse_args()
    try:
        if args.mode == 'build':
            require(args.script is not None and args.card is not None, 'build requires --script and --card')
            result = build(args.script, args.card, args.out)
        else:
            result = verify(args.out)
        print(json.dumps(result, ensure_ascii=False))
    except (ValueError, KeyError, OSError, wave.Error, TypeError) as error:
        parser.exit(1, str(error) + '\n')
