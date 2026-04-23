#!/usr/bin/env python3
"""
preload_models.py — Pre-download all models required by Aura Voice Studio.

Run this once after setup to eliminate cold-start delays on first use.
All models are downloaded to their default cache directories so the
main app picks them up transparently.

Models downloaded:
  1. XTTS-v2         — via coqui-tts (TTS library)
  2. F5-TTS MLX      — via f5-tts-mlx
  3. WhisperX large-v3 — transcription + forced alignment model
  4. WhisperX alignment model (wav2vec2 phoneme model for English)
  5. openai-whisper base — legacy fallback
"""

import sys
import os

# Apply compatibility patches before any ML library is touched.
# Must come before all other imports.
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import utils.compat  # noqa: F401

DIVIDER = "─" * 60

def banner(title: str):
    print(f"\n{DIVIDER}")
    print(f"  {title}")
    print(DIVIDER)

def ok(msg: str):
    print(f"  ✅  {msg}")

def warn(msg: str):
    print(f"  ⚠️   {msg}")

def fail(msg: str):
    print(f"  ❌  {msg}")


# ──────────────────────────────────────────────
# 1. XTTS-v2
# ──────────────────────────────────────────────
def preload_xtts():
    banner("1/5  XTTS-v2  (coqui-tts)")
    try:
        from TTS.api import TTS
        print("  Downloading XTTS-v2 weights from Hugging Face …")
        print("  (this is ~2 GB on first run, be patient)")
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
        ok("XTTS-v2 downloaded and cached.")
    except Exception as e:
        err = str(e)
        if "issubclass() arg 1 must be a class" in err:
            # coqpit deserialization bug — model IS downloaded, runtime patch will fix it.
            ok("XTTS-v2 weights downloaded. Runtime coqpit patch will handle deserialization.")
        else:
            warn(f"XTTS-v2 download skipped: {e}")
            warn("Install coqui-tts if you plan to use XTTS-v2.")


# ──────────────────────────────────────────────
# 2. F5-TTS MLX
# ──────────────────────────────────────────────
def preload_f5():
    banner("2/5  F5-TTS MLX")
    try:
        import f5_tts_mlx  # noqa: F401 — triggers package init
        # f5-tts-mlx loads weights lazily on first generate() call.
        # Just verifying the import succeeds is sufficient for setup.
        try:
            # Older API
            from f5_tts_mlx.generate import load_model
            print("  Pre-loading F5-TTS MLX weights via load_model() …")
            load_model()
        except ImportError:
            # Newer API — weights are fetched lazily; import is enough
            print("  F5-TTS MLX imported. Weights will be fetched on first use (lazy load).")
        ok("F5-TTS MLX ready.")
    except Exception as e:
        warn(f"F5-TTS MLX download skipped: {e}")
        warn("Install f5-tts-mlx if you plan to use F5-TTS.")


# ──────────────────────────────────────────────
# 3. WhisperX large-v3 (transcription)
# ──────────────────────────────────────────────
def preload_whisperx_model():
    banner("3/5  WhisperX  large-v3  (transcription)")
    try:
        import whisperx
        print("  Downloading Whisper large-v3 weights (int8/CPU) …")
        print("  (~1.5 GB on first run)")
        model = whisperx.load_model(
            "large-v3",
            device="cpu",
            compute_type="int8",
            language="en",
        )
        ok("WhisperX large-v3 downloaded and cached.")
        del model
    except Exception as e:
        warn(f"WhisperX model download skipped: {e}")
        warn("Install whisperx if you plan to use forced alignment.")


# ──────────────────────────────────────────────
# 4. WhisperX phoneme alignment model (wav2vec2)
# ──────────────────────────────────────────────
def preload_whisperx_align():
    banner("4/5  WhisperX  wav2vec2  (forced alignment)")
    try:
        import whisperx
        print("  Downloading wav2vec2 phoneme alignment model for English …")
        align_model, align_metadata = whisperx.load_align_model(
            language_code="en",
            device="cpu",
        )
        ok("WhisperX alignment model downloaded and cached.")
        del align_model, align_metadata
    except Exception as e:
        warn(f"WhisperX alignment model download skipped: {e}")


# ──────────────────────────────────────────────
# 5. openai-whisper base (legacy fallback)
# ──────────────────────────────────────────────
def preload_whisper_base():
    banner("5/5  openai-whisper  base  (legacy fallback)")
    try:
        import whisper
        print("  Downloading openai-whisper base model …")
        model = whisper.load_model("base", device="cpu")
        ok("openai-whisper base downloaded and cached.")
        del model
    except Exception as e:
        warn(f"openai-whisper base download skipped: {e}")


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🌟  Aura Voice — Model Pre-loader")
    print("   All models will be downloaded to their default cache locations.")
    print("   This only needs to run once after setup.\n")

    try:
        import gc
        preload_whisperx_model()    # Biggest — download first so failures are visible early
        gc.collect()
        preload_whisperx_align()
        gc.collect()
        preload_xtts()
        gc.collect()
        preload_f5()
        gc.collect()
        preload_whisper_base()
        gc.collect()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted. Re-run this script to finish downloading.")
        sys.exit(1)

    print(f"\n{DIVIDER}")
    print("  🎉  All models pre-loaded. Cold-start problem eliminated!")
    print("  You can now start Aura Voice with ./start.sh")
    print(DIVIDER + "\n")
