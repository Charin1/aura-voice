import sys
import traceback
from models.manager import model_manager

try:
    model_manager.load_model("xtts")
    print("Success")
except Exception as e:
    traceback.print_exc()
