#!/bin/bash
source venv/bin/activate
pip install --upgrade pip
pip install setuptools wheel
pip install thinc==8.3.0
pip install spacy==3.7.2
pip install -r requirements.txt
