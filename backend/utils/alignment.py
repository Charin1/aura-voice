"""
alignment.py — Forced alignment and smart chunking pipeline for Aura Voice.

This module provides a two-stage preprocessing pipeline:
  1. WhisperX forced alignment: produces word-level timestamps from audio.
  2. Silence-aware chunking: splits audio into 5–15 s segments, each with a
     precisely trimmed transcript derived from the alignment result.

Design notes:
- WhisperX runs on CPU (with int8 compute) to keep MPS free for TTS models.
- Pydub handles silence detection and peak normalization.
- All public functions are safe to call from an async FastAPI context
  (they are synchronous I/O-bound operations, not event-loop blocking
  in practice, but callers should wrap in `asyncio.to_thread` if needed).
"""

from __future__ import annotations

import gc
import json
import os
from dataclasses import dataclass, field, asdict
from typing import Optional

# ─────────────────────────────────────────────────────────────
# Singletons (lazy-loaded to avoid startup cost)
# ─────────────────────────────────────────────────────────────
_whisperx_model = None
_align_model = None
_align_metadata = None
_WHISPERX_LANGUAGE = "en"


# ─────────────────────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────────────────────
@dataclass
class WordToken:
    word: str
    start: float  # seconds
    end: float    # seconds
    score: float = 1.0  # alignment confidence (0-1)


@dataclass
class AlignedSegment:
    text: str
    start: float
    end: float
    words: list[WordToken] = field(default_factory=list)


@dataclass
class AlignedTranscript:
    full_text: str
    segments: list[AlignedSegment] = field(default_factory=list)
    words: list[WordToken] = field(default_factory=list)  # flat list for easy slicing


@dataclass
class ChunkInfo:
    path: str           # absolute path to chunk wav file
    txt_path: str       # absolute path to aligned transcript .txt
    start: float        # start time within master audio (seconds)
    end: float          # end time within master audio (seconds)
    duration: float
    transcript: str
    index: int


@dataclass
class PreparedReference:
    master_path: str            # normalized full-length wav
    chunk_dir: str              # directory containing chunk files
    chunks: list[ChunkInfo]
    full_transcript: str
    alignment_available: bool   # False if WhisperX was unavailable → graceful fallback


# ─────────────────────────────────────────────────────────────
# Step 1: WhisperX forced alignment
# ─────────────────────────────────────────────────────────────

def _load_whisperx():
    """Lazy-load WhisperX model (large-v3 for best accuracy on 16 GB M4)."""
    global _whisperx_model, _align_model, _align_metadata
    if _whisperx_model is not None:
        return True  # already loaded

    try:
        import whisperx

        whisper_model_name = os.getenv("WHISPERX_MODEL", "large-v3")
        print(f"🔬 Loading WhisperX ({whisper_model_name}) on CPU/int8 …")

        # Run on CPU with int8 to avoid competing with MPS TTS models.
        _whisperx_model = whisperx.load_model(
            whisper_model_name,
            device="cpu",
            compute_type="int8",
            language=_WHISPERX_LANGUAGE,
        )

        # Load alignment model for forced phoneme-level alignment
        _align_model, _align_metadata = whisperx.load_align_model(
            language_code=_WHISPERX_LANGUAGE,
            device="cpu",
        )
        print("✅ WhisperX loaded.")
        return True

    except Exception as exc:
        print(f"⚠️  WhisperX unavailable ({exc}). Falling back to openai-whisper.")
        return False


def transcribe_aligned(audio_path: str) -> AlignedTranscript:
    """
    Transcribe audio with WhisperX and return word-level forced alignment.
    Falls back to plain openai-whisper if WhisperX is not installed.
    """
    whisperx_ok = _load_whisperx()

    if whisperx_ok:
        return _transcribe_with_whisperx(audio_path)
    else:
        return _transcribe_fallback(audio_path)


def _transcribe_with_whisperx(audio_path: str) -> AlignedTranscript:
    import whisperx

    # Stage 1: transcription with VAD
    result = _whisperx_model.transcribe(audio_path, batch_size=4)

    # Stage 2: forced alignment → word timestamps
    aligned = whisperx.align(
        result["segments"],
        _align_model,
        _align_metadata,
        audio_path,
        device="cpu",
        return_char_alignments=False,
    )

    # Parse results into our dataclasses
    all_words: list[WordToken] = []
    segments: list[AlignedSegment] = []

    for seg in aligned.get("segments", []):
        seg_words = []
        for w in seg.get("words", []):
            wt = WordToken(
                word=w.get("word", "").strip(),
                start=w.get("start", seg["start"]),
                end=w.get("end", seg["end"]),
                score=w.get("score", 1.0),
            )
            seg_words.append(wt)
            all_words.append(wt)

        segments.append(AlignedSegment(
            text=seg.get("text", "").strip(),
            start=seg["start"],
            end=seg["end"],
            words=seg_words,
        ))

    full_text = " ".join(s.text for s in segments)
    return AlignedTranscript(full_text=full_text, segments=segments, words=all_words)


def _transcribe_fallback(audio_path: str) -> AlignedTranscript:
    """Plain openai-whisper fallback — produces segment-level (not word-level) timestamps."""
    try:
        import whisper as _whisper

        print("📝 Using openai-whisper fallback for transcription …")
        model_name = os.getenv("WHISPER_MODEL", "base")
        m = _whisper.load_model(model_name, device="cpu")
        result = m.transcribe(audio_path, language="en", word_timestamps=True)

        all_words: list[WordToken] = []
        segments: list[AlignedSegment] = []

        for seg in result.get("segments", []):
            seg_words = []
            for w in seg.get("words", []):
                wt = WordToken(
                    word=w.get("word", "").strip(),
                    start=w.get("start", seg["start"]),
                    end=w.get("end", seg["end"]),
                    score=0.8,  # lower confidence for non-forced alignment
                )
                seg_words.append(wt)
                all_words.append(wt)

            segments.append(AlignedSegment(
                text=seg.get("text", "").strip(),
                start=seg["start"],
                end=seg["end"],
                words=seg_words,
            ))

        full_text = " ".join(s.text for s in segments)
        return AlignedTranscript(full_text=full_text, segments=segments, words=all_words)

    except Exception as exc:
        print(f"⚠️  Transcription completely failed: {exc}")
        return AlignedTranscript(full_text="", segments=[], words=[])


# ─────────────────────────────────────────────────────────────
# Step 2: Audio normalization
# ─────────────────────────────────────────────────────────────

def normalize_peak(input_path: str, output_path: str, target_dBFS: float = -1.0):
    """
    Peak-normalize audio to target_dBFS using pydub.
    This ensures consistent volume across all reference clips.
    """
    from pydub import AudioSegment

    audio = AudioSegment.from_file(input_path)
    delta = target_dBFS - audio.max_dBFS
    normalized = audio.apply_gain(delta)
    normalized.export(output_path, format="wav")


# ─────────────────────────────────────────────────────────────
# Step 3: Silence-aware chunking
# ─────────────────────────────────────────────────────────────

def chunk_audio(
    audio_path: str,
    output_dir: str,
    aligned: AlignedTranscript,
    min_sec: float = 5.0,
    max_sec: float = 15.0,
    min_silence_ms: int = 300,
    silence_thresh_dBFS: int = -40,
) -> list[ChunkInfo]:
    """
    Split audio at natural silence boundaries into segments of 5–15 s.
    Each chunk gets a companion .txt file with the aligned transcript
    for exactly that time range.

    Returns a list of ChunkInfo, sorted by start time.
    """
    from pydub import AudioSegment
    from pydub.silence import detect_nonsilent

    os.makedirs(output_dir, exist_ok=True)
    audio = AudioSegment.from_wav(audio_path)
    total_ms = len(audio)
    total_sec = total_ms / 1000.0

    # --- Detect non-silent ranges ---
    nonsilent = detect_nonsilent(
        audio,
        min_silence_len=min_silence_ms,
        silence_thresh=silence_thresh_dBFS,
    )

    if not nonsilent:
        # Entire file is (nearly) silent — treat as one chunk
        nonsilent = [(0, total_ms)]

    # --- Merge/split ranges to hit the 5–15 s window ---
    chunks_ms = _merge_ranges(nonsilent, min_sec * 1000, max_sec * 1000)

    chunk_infos: list[ChunkInfo] = []
    for idx, (start_ms, end_ms) in enumerate(chunks_ms):
        # Clamp to audio length
        end_ms = min(end_ms, total_ms)
        duration_sec = (end_ms - start_ms) / 1000.0

        # Export chunk wav
        chunk_audio_seg = audio[start_ms:end_ms]
        chunk_path = os.path.join(output_dir, f"chunk_{idx:03d}.wav")
        chunk_audio_seg.export(chunk_path, format="wav")

        # Extract aligned transcript for this time window
        start_sec = start_ms / 1000.0
        end_sec = end_ms / 1000.0
        transcript = _extract_transcript_for_range(aligned, start_sec, end_sec)

        # Write transcript file
        txt_path = os.path.join(output_dir, f"chunk_{idx:03d}.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(transcript)

        chunk_infos.append(ChunkInfo(
            path=chunk_path,
            txt_path=txt_path,
            start=start_sec,
            end=end_sec,
            duration=duration_sec,
            transcript=transcript,
            index=idx,
        ))

    return chunk_infos


def _merge_ranges(
    ranges: list[tuple[int, int]],
    min_ms: float,
    max_ms: float,
) -> list[tuple[int, int]]:
    """
    Given a list of (start_ms, end_ms) non-silent ranges, merge consecutive
    ones until each merged chunk is ≥ min_ms. Then split any chunk > max_ms
    at the midpoint.
    """
    if not ranges:
        return ranges

    merged = []
    current_start, current_end = ranges[0]

    for start, end in ranges[1:]:
        span = current_end - current_start
        if span < min_ms:
            # Keep merging (include silence gap between segments)
            current_end = end
        else:
            merged.append((current_start, current_end))
            current_start, current_end = start, end

    merged.append((current_start, current_end))

    # Split anything longer than max_ms at the midpoint
    final = []
    for start, end in merged:
        span = end - start
        if span > max_ms:
            mid = start + span // 2
            final.append((start, mid))
            final.append((mid, end))
        else:
            final.append((start, end))

    return final


def _extract_transcript_for_range(
    aligned: AlignedTranscript,
    start_sec: float,
    end_sec: float,
) -> str:
    """
    Return all words whose midpoint falls within [start_sec, end_sec].
    Uses word-level timestamps when available, falls back to segment-level.
    """
    if aligned.words:
        words_in_range = [
            w.word for w in aligned.words
            if start_sec <= (w.start + w.end) / 2 <= end_sec
        ]
        return " ".join(words_in_range).strip()

    # Segment-level fallback
    segs_in_range = [
        s.text for s in aligned.segments
        if s.start < end_sec and s.end > start_sec
    ]
    return " ".join(segs_in_range).strip()


# ─────────────────────────────────────────────────────────────
# Step 4: Full pipeline
# ─────────────────────────────────────────────────────────────

def prepare_reference(
    normalized_audio_path: str,
    chunk_dir: str,
    min_sec: float = 5.0,
    max_sec: float = 15.0,
) -> PreparedReference:
    """
    Full preprocessing pipeline for a reference audio file.

    Assumes `normalized_audio_path` already points to a 24 kHz mono PCM WAV
    (i.e. convert_audio() has already been called by the upload endpoint).

    Steps:
      1. Peak-normalize to -1 dBFS in place.
      2. Run WhisperX forced alignment.
      3. Chunk audio into 5–15 s segments.
      4. Write manifest.json to chunk_dir.

    Returns a PreparedReference with all metadata.
    """
    os.makedirs(chunk_dir, exist_ok=True)

    # 1. Peak-normalize in place (overwrite normalized_audio_path)
    tmp_norm = normalized_audio_path + ".norm.wav"
    try:
        normalize_peak(normalized_audio_path, tmp_norm, target_dBFS=-1.0)
        os.replace(tmp_norm, normalized_audio_path)
    except Exception as exc:
        print(f"⚠️  Normalization failed ({exc}), continuing without it.")
        if os.path.exists(tmp_norm):
            os.remove(tmp_norm)

    # 2. WhisperX forced alignment
    alignment_available = False
    try:
        aligned = transcribe_aligned(normalized_audio_path)
        alignment_available = bool(aligned.words or aligned.segments)
    except Exception as exc:
        print(f"⚠️  Alignment failed ({exc}), using empty transcript.")
        aligned = AlignedTranscript(full_text="", segments=[], words=[])

    # 3. Chunk audio
    try:
        chunks = chunk_audio(
            audio_path=normalized_audio_path,
            output_dir=chunk_dir,
            aligned=aligned,
            min_sec=min_sec,
            max_sec=max_sec,
        )
    except Exception as exc:
        print(f"⚠️  Chunking failed ({exc}), creating single-chunk fallback.")
        # Fallback: treat the whole file as one chunk
        fallback_path = os.path.join(chunk_dir, "chunk_000.wav")
        import shutil
        shutil.copy2(normalized_audio_path, fallback_path)
        txt_path = os.path.join(chunk_dir, "chunk_000.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(aligned.full_text)
        from pydub import AudioSegment
        dur = len(AudioSegment.from_wav(normalized_audio_path)) / 1000.0
        chunks = [ChunkInfo(
            path=fallback_path,
            txt_path=txt_path,
            start=0.0,
            end=dur,
            duration=dur,
            transcript=aligned.full_text,
            index=0,
        )]

    # 4. Write manifest
    manifest = {
        "master": normalized_audio_path,
        "full_transcript": aligned.full_text,
        "alignment_available": alignment_available,
        "chunks": [
            {
                "index": c.index,
                "path": c.path,
                "txt_path": c.txt_path,
                "start": c.start,
                "end": c.end,
                "duration": c.duration,
                "transcript": c.transcript,
            }
            for c in chunks
        ],
    }
    manifest_path = os.path.join(chunk_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    gc.collect()

    return PreparedReference(
        master_path=normalized_audio_path,
        chunk_dir=chunk_dir,
        chunks=chunks,
        full_transcript=aligned.full_text,
        alignment_available=alignment_available,
    )


# ─────────────────────────────────────────────────────────────
# Step 5: Best-chunk selection for inference
# ─────────────────────────────────────────────────────────────

def load_manifest(chunk_dir: str) -> Optional[dict]:
    """Load the manifest.json from a chunk directory, or None if not present."""
    manifest_path = os.path.join(chunk_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        return None
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def best_chunk_for_model(chunk_dir: str, model_type: str) -> Optional[ChunkInfo]:
    """
    Select the best chunk from chunk_dir for the given model type.

    - XTTS-v2: prefers chunks of 6–10 s (its sweet spot)
    - F5-TTS:  prefers chunks of 10–15 s (more context → better conditioning)

    Returns the single best ChunkInfo, or None if no chunks are available.
    """
    manifest = load_manifest(chunk_dir)
    if not manifest or not manifest.get("chunks"):
        return None

    raw_chunks = manifest["chunks"]

    if model_type == "xtts":
        ideal_min, ideal_max = 6.0, 10.0
    else:  # f5
        ideal_min, ideal_max = 8.0, 15.0

    # Score each chunk by how close its duration is to the ideal centre
    ideal_centre = (ideal_min + ideal_max) / 2

    def score(c: dict) -> float:
        dur = c["duration"]
        # Chunks within the ideal range score 0 (best); outside penalty is proportional distance
        if ideal_min <= dur <= ideal_max:
            return abs(dur - ideal_centre)
        elif dur < ideal_min:
            return ideal_min - dur + 100  # penalty
        else:
            return dur - ideal_max + 100  # penalty

    best_raw = min(raw_chunks, key=score)

    # Only return chunks with a non-empty transcript
    if not best_raw.get("transcript", "").strip():
        # Fall back to the longest chunk with any transcript
        for c in sorted(raw_chunks, key=lambda x: x["duration"], reverse=True):
            if c.get("transcript", "").strip():
                best_raw = c
                break

    return ChunkInfo(
        path=best_raw["path"],
        txt_path=best_raw["txt_path"],
        start=best_raw["start"],
        end=best_raw["end"],
        duration=best_raw["duration"],
        transcript=best_raw["transcript"],
        index=best_raw["index"],
    )


# ─────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────

def get_audio_duration(audio_path: str) -> float:
    """Return audio duration in seconds using pydub."""
    from pydub import AudioSegment
    return len(AudioSegment.from_file(audio_path)) / 1000.0


def chunk_dir_for_reference(references_dir: str, ref_id: str) -> str:
    """Canonical path to the chunk directory for a given reference ID."""
    return os.path.join(references_dir, ref_id)
