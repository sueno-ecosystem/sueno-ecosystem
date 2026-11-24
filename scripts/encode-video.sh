#!/usr/bin/env bash
# Usage: scripts/encode-video.sh input.mov output_720.mp4
# Encodes a short clip to 720p H.264 MP4 that starts playing before fully downloaded.
set -euo pipefail
ffmpeg -i "$1" -vf scale=-2:720 -c:v libx264 -crf 23 -preset slow \
  -c:a aac -b:a 128k -movflags +faststart "$2"
