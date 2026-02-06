#!/bin/bash
# Smart Meter Texas Connector
# Run this script to automatically download your usage data

cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required. Please install it first."
    exit 1
fi

# Install dependencies if needed
pip3 install -q playwright 2>/dev/null
playwright install chromium 2>/dev/null

# Run the connector
python3 connect_smt.py
