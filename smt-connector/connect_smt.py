#!/usr/bin/env python3
"""
Smart Meter Texas Data Connector
Automatically downloads your Green Button data and sends it to Power to the People

Usage:
    python connect_smt.py

Requirements:
    pip install playwright
    playwright install chromium
"""

import asyncio
import json
import base64
import os
import sys
import time
import urllib.parse
import webbrowser
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install playwright")
    os.system("playwright install chromium")
    from playwright.async_api import async_playwright


# Configuration
APP_URL = "http://localhost:5173"  # Change to production URL when deployed
CALLBACK_PATH = "/qualify/smt-callback"
SMT_URL = "https://www.smartmetertexas.com/home"
DOWNLOAD_DIR = Path.home() / "Downloads"


async def main():
    print("\n" + "=" * 60)
    print("  Smart Meter Texas Data Connector")
    print("  Power to the People - Solar Enrollment")
    print("=" * 60 + "\n")

    async with async_playwright() as p:
        # Launch browser (visible so user can log in)
        print("Opening browser...")
        browser = await p.chromium.launch(
            headless=False,
            downloads_path=str(DOWNLOAD_DIR)
        )

        context = await browser.new_context(
            accept_downloads=True
        )
        page = await context.new_page()

        # Navigate to SMT
        print(f"Navigating to Smart Meter Texas...")
        await page.goto(SMT_URL)

        # Wait for user to log in
        print("\n" + "-" * 60)
        print("  Please log in to Smart Meter Texas")
        print("  The script will continue automatically after you log in")
        print("-" * 60 + "\n")

        # Wait for login - detect by looking for dashboard elements or logout button
        try:
            # Wait for either dashboard content or a logout/menu element
            await page.wait_for_selector(
                'text="Green Button" >> visible=true, '
                'text="Download My Data" >> visible=true, '
                'text="My Usage" >> visible=true, '
                'text="Log Out" >> visible=true, '
                '.dashboard >> visible=true',
                timeout=300000  # 5 minutes to log in
            )
            print("Login detected!")
        except:
            # Alternative: wait for URL change away from login page
            while "login" in page.url.lower() or "home" in page.url.lower():
                await asyncio.sleep(1)
            print("Login detected (URL changed)!")

        await asyncio.sleep(2)  # Let page fully load

        # Look for Green Button Download
        print("Looking for Green Button Download...")

        # Try multiple selectors for the Green Button
        green_button_selectors = [
            'button:has-text("Green Button")',
            'button:has-text("Download My Data")',
            '.green-button-text1',
            'button:has(img[alt*="Green"])',
            '[class*="green-button"]',
            'text="Green Button Download My Data"',
        ]

        download_button = None
        for selector in green_button_selectors:
            try:
                download_button = await page.wait_for_selector(selector, timeout=5000)
                if download_button:
                    print(f"Found Green Button with selector: {selector}")
                    break
            except:
                continue

        if not download_button:
            print("\nCould not find Green Button automatically.")
            print("Please click 'Green Button Download My Data' manually.")
            print("Waiting for download...")

        # Set up download handler
        downloaded_file = None

        async with page.expect_download(timeout=120000) as download_info:
            if download_button:
                print("Clicking Green Button Download...")
                await download_button.click()
            else:
                print("Waiting for you to click the download button...")

            download = await download_info.value

        # Save the downloaded file
        download_path = DOWNLOAD_DIR / download.suggested_filename
        await download.save_as(download_path)
        print(f"\nDownload complete: {download_path}")

        # Read the file content
        print("Reading file content...")
        with open(download_path, 'r') as f:
            file_content = f.read()

        # Parse the XML to extract usage data
        usage_data = parse_green_button_xml(file_content)

        if usage_data:
            print(f"\nExtracted data:")
            print(f"  ESIID: {usage_data.get('esiid', 'N/A')}")
            print(f"  Annual Usage: {usage_data.get('annualKwh', 'N/A'):,} kWh")
            print(f"  Months of data: {len(usage_data.get('monthlyUsage', []))}")

            # Encode and send to our app
            encoded_data = base64.b64encode(json.dumps({
                'data': usage_data,
                'extractedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'source': 'python_connector'
            }).encode()).decode()

            callback_url = f"{APP_URL}{CALLBACK_PATH}?data={urllib.parse.quote(encoded_data)}"

            print(f"\nOpening Power to the People app with your data...")
            webbrowser.open(callback_url)
        else:
            print("\nCould not parse usage data from file.")
            print(f"File saved at: {download_path}")
            print("Please upload it manually to the app.")

        # Close browser
        await browser.close()

        print("\n" + "=" * 60)
        print("  Done! Check your browser for the results.")
        print("=" * 60 + "\n")


def parse_green_button_xml(xml_content):
    """Parse Green Button XML format to extract usage data"""
    import re

    usage_data = {
        'readings': [],
        'monthlyUsage': {},
        'esiid': None,
        'annualKwh': 0
    }

    # Extract ESIID
    esiid_match = re.search(r'<ServiceDeliveryPoint>.*?(\d{10,22}).*?</ServiceDeliveryPoint>', xml_content, re.DOTALL)
    if not esiid_match:
        esiid_match = re.search(r'ESIID[:\s]*(\d{10,22})', xml_content)
    if esiid_match:
        usage_data['esiid'] = esiid_match.group(1)

    # Find all IntervalReading elements
    readings = re.findall(
        r'<IntervalReading>.*?<timePeriod>.*?<start>(\d+)</start>.*?</timePeriod>.*?<value>(\d+)</value>.*?</IntervalReading>',
        xml_content,
        re.DOTALL
    )

    total_kwh = 0
    monthly_totals = {}

    for timestamp, value in readings:
        try:
            # Convert Unix timestamp to date
            ts = int(timestamp)
            date = time.strftime('%Y-%m', time.gmtime(ts))

            # Value is typically in Wh, convert to kWh
            kwh = int(value) / 1000

            usage_data['readings'].append({
                'timestamp': ts,
                'kWh': kwh
            })

            # Aggregate by month
            if date not in monthly_totals:
                monthly_totals[date] = 0
            monthly_totals[date] += kwh
            total_kwh += kwh

        except (ValueError, TypeError):
            continue

    # Convert monthly totals to sorted list
    usage_data['monthlyUsage'] = [
        {'month': month, 'kWh': round(kwh, 1)}
        for month, kwh in sorted(monthly_totals.items())
    ]

    usage_data['annualKwh'] = round(total_kwh, 1)

    return usage_data if usage_data['readings'] else None


if __name__ == "__main__":
    asyncio.run(main())
