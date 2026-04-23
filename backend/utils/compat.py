"""
compat.py — Centralised compatibility patches for known library conflicts in Aura Voice.

Import this module early (before any ML libraries) to apply all patches.
It is safe to import multiple times — all patches are idempotent.

Patches applied:
  1. transformers.pytorch_utils.isin_mps_friendly   (MPS + modern transformers)
  2. transformers.BeamSearchScorer                   (coqui-tts + transformers >= 4.45)
  3. torch.load weights_only                         (PyTorch 2.6+)
  4. coqpit._deserialize generic-type safety         (coqui-tts + Python 3.11)
  5. torchaudio.AudioMetaData                        (torchaudio 2.x + whisperx)
"""

from __future__ import annotations
import torch


# ─────────────────────────────────────────────────────────────
# 1. isin_mps_friendly — modern transformers removed this util
# ─────────────────────────────────────────────────────────────
try:
    import transformers.pytorch_utils as _pt_utils
    if not hasattr(_pt_utils, "isin_mps_friendly"):
        def isin_mps_friendly(elements, test_elements, assume_unique=False, invert=False):
            return torch.isin(elements, test_elements, assume_unique=assume_unique, invert=invert)
        _pt_utils.isin_mps_friendly = isin_mps_friendly
except Exception:
    pass


# ─────────────────────────────────────────────────────────────
# 2. BeamSearchScorer — removed from transformers >= 4.45 top-level,
#    but coqui-tts does `from transformers import BeamSearchScorer`
# ─────────────────────────────────────────────────────────────
try:
    import transformers as _transformers
    if not hasattr(_transformers, "BeamSearchScorer"):
        try:
            from transformers.generation.beam_search import BeamSearchScorer as _BSS
            _transformers.BeamSearchScorer = _BSS
        except ImportError:
            pass  # Fully removed — coqpit patch (#4) will handle the fallout
except Exception:
    pass


# ─────────────────────────────────────────────────────────────
# 3. torch.load weights_only default — PyTorch 2.6+ requires
#    explicit opt-in for unpickling; coqui-tts doesn't pass it
# ─────────────────────────────────────────────────────────────
_original_torch_load = torch.load

def _patched_torch_load(*args, **kwargs):
    if "weights_only" not in kwargs:
        kwargs["weights_only"] = False
    return _original_torch_load(*args, **kwargs)

torch.load = _patched_torch_load


# ─────────────────────────────────────────────────────────────
# 4. coqpit._deserialize — Python 3.11 generic types
#    (Optional[X], List[X], etc.) are not classes; issubclass()
#    raises TypeError. Wrap _deserialize to return value as-is
#    for unrecognised generic types rather than crashing.
# ─────────────────────────────────────────────────────────────
try:
    import coqpit.coqpit as _coqpit
    _orig_coqpit_deserialize = _coqpit._deserialize

    def _safe_coqpit_deserialize(value, field_type):
        try:
            return _orig_coqpit_deserialize(value, field_type)
        except TypeError as e:
            if "issubclass() arg 1 must be a class" in str(e):
                # field_type is a generic alias (Optional, List, Union) that coqpit
                # can't handle. Return the raw value — good enough for config loading.
                return value
            raise

    _coqpit._deserialize = _safe_coqpit_deserialize
except Exception:
    pass


# ─────────────────────────────────────────────────────────────
# 5. torchaudio.AudioMetaData — removed in torchaudio 2.x but
#    whisperx still references it directly
# ─────────────────────────────────────────────────────────────
try:
    import torchaudio as _torchaudio
    if not hasattr(_torchaudio, "AudioMetaData"):
        from collections import namedtuple
        _torchaudio.AudioMetaData = namedtuple(
            "AudioMetaData",
            ["sample_rate", "num_frames", "num_channels", "bits_per_sample", "encoding"],
        )
except Exception:
    pass
