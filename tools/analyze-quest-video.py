#!/usr/bin/env python3
"""Collect evidence from a Ragnarok Online quest walkthrough video.

The tool deliberately does not interpret the quest. It creates timestamped,
reviewable evidence: subtitles/transcript, sampled frames, optional OCR, and a
Markdown index for writing the quest script.

Examples:
  python tools/analyze-quest-video.py URL -o artifacts/dragon-knight
  python tools/analyze-quest-video.py video.mp4 -o artifacts/test --every 5 --ocr
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    print("+", " ".join(cmd), file=sys.stderr)
    return subprocess.run(cmd, cwd=cwd, text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=check)


def exe(name: str) -> str | None:
    return shutil.which(name)


def is_url(value: str) -> bool:
    return bool(re.match(r"https?://", value, re.I))


def timestamp(seconds: float) -> str:
    whole = max(0, int(seconds))
    h, rest = divmod(whole, 3600)
    m, s = divmod(rest, 60)
    return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def parse_srt(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    blocks = re.split(r"\n\s*\n", text.strip())
    rows = []
    for block in blocks:
        lines = block.splitlines()
        if len(lines) < 3:
            continue
        match = re.search(r"(\d{2}:\d{2}:\d{2}[,.]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[,.]\d{3})", lines[1])
        if not match:
            continue
        def sec(value: str) -> float:
            h, m, s = value.replace(",", ".").split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
        rows.append({"start": sec(match.group(1)), "end": sec(match.group(2)),
                     "text": " ".join(x.strip() for x in lines[2:] if x.strip())})
    return rows


def download(url: str, out: Path, languages: str) -> tuple[Path, list[dict]]:
    ytdlp = exe("yt-dlp")
    if not ytdlp:
        raise RuntimeError("yt-dlp is required for a URL. Install it, or pass a local video file.")
    out.mkdir(parents=True, exist_ok=True)
    template = str(out / "video.%(ext)s")
    run([ytdlp, "--no-playlist", "--format", "bestvideo*+bestaudio/best",
         "--merge-output-format", "mp4", "--write-subs", "--write-auto-subs",
         "--sub-langs", languages, "--sub-format", "srt",
         "-o", template, url])
    videos = [p for p in out.glob("video.*") if p.suffix.lower() not in {".srt", ".vtt", ".json", ".part"}]
    if not videos:
        raise RuntimeError("yt-dlp finished without a downloaded video file")
    subs = sorted(out.glob("video*.srt"))
    return videos[0], parse_srt(subs[0]) if subs else []


def extract_frames(ffmpeg: str, video: Path, frames: Path, every: int) -> None:
    frames.mkdir(parents=True, exist_ok=True)
    run([ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(video),
         "-vf", f"fps=1/{every}", "-q:v", "2", str(frames / "frame-%06d.jpg")])


def frame_time(index: int, every: int) -> float:
    return float(index * every)


def do_ocr(tesseract: str, frames: Path, output: Path, every: int) -> list[dict]:
    rows = []
    for image in sorted(frames.glob("frame-*.jpg")):
        index = int(image.stem.split("-")[-1])
        result = run([tesseract, str(image), "stdout", "-l", "eng"], check=False)
        text = result.stdout.strip()
        rows.append({"frame": image.name, "time": frame_time(index - 1, every), "text": text,
                     "error": result.stderr.strip() if result.returncode else None})
    output.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n", encoding="utf-8")
    return rows


def write_notes(out: Path, source: str, video: Path, subtitles: list[dict], ocr: list[dict], every: int) -> None:
    lines = ["# Quest video evidence", "", f"- Source: `{source}`", f"- Video: `{video.name}`",
             f"- Frame interval: {every} seconds", "", "## Review checklist", "",
             "- [ ] Confirm start NPC and coordinates", "- [ ] Record prerequisites and quest IDs",
             "- [ ] Record every dialogue/menu choice", "- [ ] Record map and instance transitions",
             "- [ ] Record monsters, objectives, failure and retry behavior",
             "- [ ] Record reward and final job change", "", "## Timeline", "",
             "| Time | Evidence | Notes |", "|---|---|---|"]
    events: list[tuple[float, str]] = []
    events.extend((row["start"], row["text"]) for row in subtitles if row["text"])
    events.extend((row["time"], row["text"].replace("\n", " ")) for row in ocr if row["text"])
    for time_value, text in sorted(events):
        clean = text.replace("|", "\\|")[:300]
        lines.append(f"| `{timestamp(time_value)}` | transcript/OCR | {clean} |")
    lines.extend(["", "## Manual observations", "", "Add verified game facts here. Keep uncertain positions, stats, sprites and effects explicitly marked as assumptions.", ""])
    (out / "quest-notes.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="YouTube URL or local video file")
    parser.add_argument("-o", "--output", required=True, type=Path)
    parser.add_argument("--every", type=int, default=5, help="Seconds between sampled frames (default: 5)")
    parser.add_argument("--ocr", action="store_true", help="Run Tesseract OCR when installed")
    parser.add_argument("--sub-langs", default="en.*,ru.*", help="yt-dlp subtitle language patterns")
    args = parser.parse_args()
    if args.every < 1:
        parser.error("--every must be at least 1")
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    ffmpeg = exe("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to extract frames")
    subtitles: list[dict] = []
    if is_url(args.source):
        video, subtitles = download(args.source, out, args.sub_langs)
    else:
        video = Path(args.source).resolve()
        if not video.exists():
            raise RuntimeError(f"video file not found: {video}")
        (out / "source.txt").write_text(str(video), encoding="utf-8")
        sibling_subs = sorted(video.parent.glob(video.stem + "*.srt"))
        if sibling_subs:
            subtitles = parse_srt(sibling_subs[0])
    (out / "subtitles.json").write_text(json.dumps(subtitles, ensure_ascii=False, indent=2), encoding="utf-8")
    frames = out / "frames"
    extract_frames(ffmpeg, video, frames, args.every)
    ocr_rows: list[dict] = []
    tesseract = exe("tesseract")
    if args.ocr and tesseract:
        ocr_rows = do_ocr(tesseract, frames, out / "ocr.jsonl", args.every)
    elif args.ocr:
        print("warning: --ocr requested but tesseract was not found; frames were still created", file=sys.stderr)
    write_notes(out, args.source, video, subtitles, ocr_rows, args.every)
    print(json.dumps({"output": str(out), "video": str(video), "frames": len(list(frames.glob("*.jpg"))),
                      "subtitles": len(subtitles), "ocr": len(ocr_rows)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(2)
