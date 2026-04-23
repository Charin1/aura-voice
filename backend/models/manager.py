import torch
import gc
import os
from typing import Any, Optional

# Apply all compatibility patches before any ML library imports.
# compat.py handles: transformers isin_mps_friendly, BeamSearchScorer,
# torch.load weights_only, coqpit generic-type deserialization, torchaudio AudioMetaData.
import utils.compat  # noqa: F401  (import for side-effects)

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.current_model_type = None
        self.model: Optional[Any] = None
        self.models_path = os.path.join(os.path.dirname(__file__), "..", "weights")
        os.makedirs(self.models_path, exist_ok=True)
        self._initialized = True

    def _clear_memory(self):
        """Clears memory before switching models."""
        print("🧹 Clearing memory...")
        self.model = None
        gc.collect()
        if torch.backends.mps.is_available():
            # torch.mps exists on Apple builds; keep this guarded anyway.
            try:
                torch.mps.empty_cache()
            except Exception:
                pass

    def _preflight_model_type(self, model_type: str) -> None:
        if model_type not in {"xtts", "f5"}:
            raise ValueError(f"Unsupported model_type: {model_type}")

        # Validate optional dependencies *before* clearing the currently loaded model
        # so a missing install doesn't take the whole backend down.
        if model_type == "xtts":
            try:
                from TTS.api import TTS  # noqa: F401
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise RuntimeError(
                    "XTTS dependency missing or failed to import. Install `coqui-tts` and its deps, "
                    "then restart the backend."
                ) from e

        if model_type == "f5":
            try:
                import f5_tts_mlx  # noqa: F401
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise RuntimeError(
                    "F5 dependency missing or failed to import. Install `f5-tts-mlx` and its deps, "
                    "then restart the backend."
                ) from e

    def load_model(self, model_type):
        """Loads the requested model, unloading the previous one if necessary."""
        self._preflight_model_type(model_type)

        if self.current_model_type == model_type and self.model is not None:
            return self.model

        self._clear_memory()

        if model_type == "xtts":
            print("🚀 Loading XTTS-v2 (Stable)...")
            # For 16GB Apple Silicon, try float16 to save memory
            # XTTS-v2 has some MPS op constraints, but can load half precision
            device = "cpu" if self.device == "mps" else self.device
            from TTS.api import TTS
            self.model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
            self.current_model_type = "xtts"
        
        elif model_type == "f5":
            print("🚀 Loading F5-TTS MLX (Turbo)...")
            # f5-tts-mlx uses MLX, which handles its own memory on Apple Silicon
            # We just need to ensure we download weights first
            # Many f5-tts-mlx installs load weights lazily inside `generate`.
            # Keep a lightweight marker here for stats/UI.
            try:
                from f5_tts_mlx.generate import load_model as load_f5_model
                self.model = load_f5_model()
            except Exception:
                self.model = {"type": "f5", "loaded": False}
            self.current_model_type = "f5"

        return self.model

    @property
    def is_mps(self):
        return self.device == "mps"

model_manager = ModelManager()
