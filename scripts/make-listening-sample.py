"""Generate only the project's original Listening fixture; requires ffmpeg with flite.

Run from repository root. No downloaded audio or third-party exam content is used.
Cue times are PCM segment boundaries, not measured speech-recognition accuracy.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]
TEXTS = [
    "Welcome to the community garden tour. Our next tour takes place on Tuesday. Please arrive ten minutes before the start.",
    "We will meet outside the library, beside the blue gate. A volunteer will take you from there to the garden.",
    "You do not need any gardening tools. Please bring a notebook so you can write down ideas during the tour.",
]
output = ROOT / "apps/web/public/audio/garden-tour.wav"
output.parent.mkdir(parents=True, exist_ok=True)
cues = []
with tempfile.TemporaryDirectory() as directory:
    chunks = []
    elapsed = 0
    for i, text in enumerate(TEXTS):
        source = Path(directory) / f"cue-{i}.txt"
        target = Path(directory) / f"cue-{i}.wav"
        source.write_text(text)
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i",
                        f"flite=textfile={source}:voice=slt", "-ar", "16000", "-ac", "1", str(target)], check=True)
        with wave.open(str(target)) as audio:
            frames = audio.readframes(audio.getnframes())
            length = audio.getnframes() / 16000
        chunks.append(b"\0" * 16000)  # half a second of 16-bit mono silence
        elapsed += 0.5
        cues.append({"id": f"cue-{i+1}", "start": elapsed, "end": elapsed + length, "text": text})
        chunks.append(frames)
        elapsed += length
    with wave.open(str(output), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"".join(chunks))
metadata = {"sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "duration": elapsed, "cues": cues}
(ROOT / "packages/content/listening-sample.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(f"Generated original sample: {elapsed:.2f}s; {output.stat().st_size} bytes")
