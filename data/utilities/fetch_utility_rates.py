#!/usr/bin/env python3
"""
Fetch national utility rate data from OpenEI USURDB API.
Queries multiple geographic points per state to capture major utilities,
then fetches detailed rate structures for residential rates.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

API_KEY = sys.argv[1] if len(sys.argv) > 1 else ""
BASE_URL = "https://api.openei.org/utility_rates"
OUTPUT_DIR = "/Users/justingriffith/projects/solar-crm/data/utilities"
STATES_DIR = os.path.join(OUTPUT_DIR, "states")

# Multiple query points per state: major cities with lat/lon
# Using 2-4 population centers per state to maximize utility coverage
STATE_QUERY_POINTS = {
    "AL": [("Birmingham", 33.52, -86.81), ("Mobile", 30.69, -88.04), ("Huntsville", 34.73, -86.59)],
    "AK": [("Anchorage", 61.22, -149.90), ("Fairbanks", 64.84, -147.72), ("Juneau", 58.30, -134.42)],
    "AZ": [("Phoenix", 33.45, -112.07), ("Tucson", 32.22, -110.97), ("Flagstaff", 35.20, -111.65)],
    "AR": [("Little Rock", 34.75, -92.29), ("Fayetteville", 36.06, -94.16), ("Jonesboro", 35.84, -90.70)],
    "CA": [("Los Angeles", 34.05, -118.24), ("San Francisco", 37.77, -122.42), ("Sacramento", 38.58, -121.49), ("San Diego", 32.72, -117.16)],
    "CO": [("Denver", 39.74, -104.99), ("Colorado Springs", 38.83, -104.82), ("Grand Junction", 39.06, -108.55)],
    "CT": [("Hartford", 41.76, -72.68), ("New Haven", 41.31, -72.92), ("Stamford", 41.05, -73.54)],
    "DE": [("Wilmington", 39.74, -75.55), ("Dover", 39.16, -75.52)],
    "FL": [("Miami", 25.76, -80.19), ("Orlando", 28.54, -81.38), ("Tampa", 27.95, -82.46), ("Jacksonville", 30.33, -81.66)],
    "GA": [("Atlanta", 33.75, -84.39), ("Savannah", 32.08, -81.09), ("Augusta", 33.47, -81.97)],
    "HI": [("Honolulu", 21.31, -157.86), ("Hilo", 19.72, -155.08), ("Kahului", 20.89, -156.47)],
    "ID": [("Boise", 43.62, -116.20), ("Idaho Falls", 43.47, -112.03), ("Coeur d'Alene", 47.68, -116.78)],
    "IL": [("Chicago", 41.88, -87.63), ("Springfield", 39.78, -89.65), ("Rockford", 42.27, -89.09)],
    "IN": [("Indianapolis", 39.77, -86.16), ("Fort Wayne", 41.08, -85.14), ("Evansville", 37.97, -87.56)],
    "IA": [("Des Moines", 41.59, -93.62), ("Cedar Rapids", 41.98, -91.66), ("Davenport", 41.52, -90.58)],
    "KS": [("Wichita", 37.69, -97.34), ("Topeka", 39.05, -95.68), ("Kansas City", 39.11, -94.63)],
    "KY": [("Louisville", 38.25, -85.76), ("Lexington", 38.04, -84.50), ("Bowling Green", 36.99, -86.44)],
    "LA": [("New Orleans", 29.95, -90.07), ("Baton Rouge", 30.45, -91.19), ("Shreveport", 32.53, -93.75)],
    "ME": [("Portland", 43.66, -70.26), ("Bangor", 44.80, -68.77), ("Augusta", 44.31, -69.78)],
    "MD": [("Baltimore", 39.29, -76.61), ("Rockville", 39.08, -77.15), ("Annapolis", 38.98, -76.49)],
    "MA": [("Boston", 42.36, -71.06), ("Worcester", 42.26, -71.80), ("Springfield", 42.10, -72.59)],
    "MI": [("Detroit", 42.33, -83.05), ("Grand Rapids", 42.96, -85.66), ("Traverse City", 44.76, -85.62)],
    "MN": [("Minneapolis", 44.98, -93.27), ("Rochester", 44.02, -92.47), ("Duluth", 46.79, -92.10)],
    "MS": [("Jackson", 32.30, -90.18), ("Gulfport", 30.37, -89.09), ("Tupelo", 34.26, -88.70)],
    "MO": [("Kansas City", 39.10, -94.58), ("St. Louis", 38.63, -90.20), ("Springfield", 37.22, -93.29)],
    "MT": [("Billings", 45.78, -108.50), ("Missoula", 46.87, -114.00), ("Great Falls", 47.51, -111.30)],
    "NE": [("Omaha", 41.26, -95.94), ("Lincoln", 40.81, -96.70), ("Grand Island", 40.92, -98.34)],
    "NV": [("Las Vegas", 36.17, -115.14), ("Reno", 39.53, -119.81), ("Carson City", 39.16, -119.77)],
    "NH": [("Manchester", 42.99, -71.46), ("Concord", 43.21, -71.54), ("Nashua", 42.77, -71.47)],
    "NJ": [("Newark", 40.74, -74.17), ("Trenton", 40.22, -74.76), ("Atlantic City", 39.36, -74.42)],
    "NM": [("Albuquerque", 35.08, -106.65), ("Las Cruces", 32.35, -106.76), ("Santa Fe", 35.69, -105.94)],
    "NY": [("New York", 40.71, -74.01), ("Buffalo", 42.89, -78.88), ("Albany", 42.65, -73.75), ("Syracuse", 43.05, -76.15)],
    "NC": [("Charlotte", 35.23, -80.84), ("Raleigh", 35.78, -78.64), ("Asheville", 35.60, -82.55)],
    "ND": [("Fargo", 46.88, -96.79), ("Bismarck", 46.81, -100.78), ("Grand Forks", 47.93, -97.03)],
    "OH": [("Columbus", 39.96, -83.00), ("Cleveland", 41.50, -81.69), ("Cincinnati", 39.10, -84.51)],
    "OK": [("Oklahoma City", 35.47, -97.52), ("Tulsa", 36.15, -95.99), ("Lawton", 34.60, -98.39)],
    "OR": [("Portland", 45.52, -122.68), ("Eugene", 44.05, -123.09), ("Bend", 44.06, -121.31)],
    "PA": [("Philadelphia", 39.95, -75.17), ("Pittsburgh", 40.44, -80.00), ("Harrisburg", 40.27, -76.88)],
    "RI": [("Providence", 41.82, -71.41), ("Warwick", 41.70, -71.42)],
    "SC": [("Charleston", 32.78, -79.93), ("Columbia", 34.00, -81.03), ("Greenville", 34.85, -82.40)],
    "SD": [("Sioux Falls", 43.55, -96.73), ("Rapid City", 44.08, -103.23), ("Aberdeen", 45.46, -98.49)],
    "TN": [("Nashville", 36.16, -86.78), ("Memphis", 35.15, -90.05), ("Knoxville", 35.96, -83.92)],
    "TX": [("Houston", 29.76, -95.37), ("Dallas", 32.78, -96.80), ("Austin", 30.27, -97.74), ("San Antonio", 29.42, -98.49)],
    "UT": [("Salt Lake City", 40.76, -111.89), ("Provo", 40.23, -111.66), ("St. George", 37.10, -113.58)],
    "VT": [("Burlington", 44.48, -73.21), ("Montpelier", 44.26, -72.58), ("Rutland", 43.61, -72.97)],
    "VA": [("Richmond", 37.54, -77.44), ("Virginia Beach", 36.85, -75.98), ("Roanoke", 37.27, -79.94)],
    "WA": [("Seattle", 47.61, -122.33), ("Spokane", 47.66, -117.43), ("Tacoma", 47.25, -122.44)],
    "WV": [("Charleston", 38.35, -81.63), ("Huntington", 38.42, -82.45), ("Morgantown", 39.63, -79.96)],
    "WI": [("Milwaukee", 43.04, -87.91), ("Madison", 43.07, -89.40), ("Green Bay", 44.51, -88.02)],
    "WY": [("Cheyenne", 41.14, -104.82), ("Casper", 42.87, -106.31), ("Laramie", 41.31, -105.59)],
}

# Major IOUs by state (for customer count estimation and type classification)
# Source: EIA-861 data, supplemented by web research
MAJOR_IOUS = {
    "AL": {"Alabama Power Co": 1500000, "Tennessee Valley Authority": 0},
    "AK": {"Chugach Electric Assn Inc": 92000, "Golden Valley Elec Assn Inc": 45000, "Matanuska Electric Assn Inc": 60000},
    "AZ": {"Arizona Public Service Co": 1300000, "Tucson Electric Power Co": 430000, "Salt River Project": 1100000},
    "AR": {"Entergy Arkansas LLC": 720000, "Southwestern Electric Power Co": 110000, "Empire District Electric Co": 50000},
    "CA": {"Pacific Gas & Electric Co": 5500000, "Southern California Edison Co": 5100000, "San Diego Gas & Electric Co": 1500000, "Los Angeles Dept of Water & Power": 1500000, "Sacramento Municipal Util Dist": 650000},
    "CO": {"Public Service Co of Colorado": 1500000, "Colorado Springs Utilities": 240000, "Black Hills Colorado Electric": 100000},
    "CT": {"Eversource Energy": 1300000, "United Illuminating Co": 340000},
    "DE": {"Delmarva Power": 310000},
    "FL": {"Florida Power & Light Co": 5600000, "Duke Energy Florida LLC": 1900000, "Tampa Electric Co": 800000, "JEA": 490000, "Gulf Power Co": 480000},
    "GA": {"Georgia Power Co": 2700000, "Cobb EMC": 200000, "Jackson EMC": 230000},
    "HI": {"Hawaiian Electric Co Inc": 470000, "Maui Electric Co Ltd": 75000, "Hawaii Electric Light Co Inc": 85000},
    "ID": {"Idaho Power Co": 600000, "Rocky Mountain Power": 90000, "Avista Corp": 50000},
    "IL": {"Commonwealth Edison Co": 4000000, "Ameren Illinois Co": 1200000, "MidAmerican Energy Co": 150000},
    "IN": {"Indiana Michigan Power Co": 470000, "Duke Energy Indiana LLC": 850000, "Indianapolis Power & Light Co": 500000, "Indiana & Michigan Electric": 200000},
    "IA": {"MidAmerican Energy Co": 780000, "Alliant Energy": 500000, "Interstate Power and Light Co": 230000},
    "KS": {"Evergy Kansas Central": 700000, "Evergy Kansas Metro": 330000, "Empire District Electric Co": 50000},
    "KY": {"Kentucky Utilities Co": 540000, "Louisville Gas & Electric Co": 410000, "Duke Energy Kentucky": 150000, "Kentucky Power Co": 165000},
    "LA": {"Entergy Louisiana LLC": 1100000, "Cleco Power LLC": 300000, "Southwestern Electric Power Co": 150000},
    "ME": {"Central Maine Power Co": 640000, "Versant Power": 160000},
    "MD": {"Baltimore Gas & Electric Co": 1300000, "Potomac Electric Power Co": 600000, "Delmarva Power": 200000},
    "MA": {"Eversource Energy": 1500000, "National Grid": 1300000, "Unitil Energy Systems": 110000},
    "MI": {"DTE Electric Co": 2200000, "Consumers Energy Co": 1800000, "Indiana Michigan Power Co": 80000},
    "MN": {"Northern States Power Co": 1500000, "Minnesota Power": 150000, "Otter Tail Power Co": 65000},
    "MS": {"Entergy Mississippi LLC": 460000, "Mississippi Power Co": 190000, "Tennessee Valley Authority": 0},
    "MO": {"Ameren Missouri": 1200000, "Evergy Missouri West": 300000, "Empire District Electric Co": 170000},
    "MT": {"NorthWestern Corp": 380000, "Flathead Electric Coop": 60000},
    "NE": {"Omaha Public Power District": 390000, "Nebraska Public Power District": 250000, "Lincoln Electric System": 140000},
    "NV": {"NV Energy (Sierra Pacific)": 400000, "NV Energy (Nevada Power)": 1000000},
    "NH": {"Eversource Energy": 520000, "Liberty Utilities": 45000, "Unitil Energy Systems": 40000},
    "NJ": {"Public Service Elec & Gas Co": 2300000, "Jersey Central Power & Light": 1100000, "Atlantic City Electric Co": 560000},
    "NM": {"Public Service Co of New Mexico": 550000, "El Paso Electric Co": 110000, "Southwestern Public Service Co": 60000},
    "NY": {"Consolidated Edison Co": 3400000, "National Grid": 1700000, "New York State Elec & Gas Corp": 900000, "Central Hudson Gas & Elec Corp": 310000, "Rochester Gas & Electric Corp": 380000, "Long Island Power Authority": 1100000},
    "NC": {"Duke Energy Carolinas LLC": 2700000, "Duke Energy Progress LLC": 1700000, "Dominion Energy North Carolina": 130000},
    "ND": {"Montana-Dakota Utilities Co": 70000, "Otter Tail Power Co": 35000, "Xcel Energy": 40000},
    "OH": {"Ohio Edison Co": 1050000, "Cleveland Elec Illuminating Co": 750000, "Ohio Power Co": 1500000, "Duke Energy Ohio Inc": 720000, "Dayton Power & Light Co": 530000},
    "OK": {"Oklahoma Gas & Electric Co": 880000, "Public Service Co of Oklahoma": 560000, "Empire District Electric Co": 40000},
    "OR": {"Portland General Electric Co": 900000, "PacifiCorp": 600000, "Idaho Power Co": 30000},
    "PA": {"PECO Energy Co": 1600000, "PPL Electric Utilities Corp": 1400000, "Duquesne Light Co": 600000, "West Penn Power Co": 720000, "Metropolitan Edison Co": 560000},
    "RI": {"Rhode Island Energy": 500000},
    "SC": {"Duke Energy Carolinas LLC": 800000, "Duke Energy Progress LLC": 500000, "South Carolina Electric & Gas": 730000},
    "SD": {"Northwestern Energy": 75000, "Xcel Energy": 50000, "Otter Tail Power Co": 20000},
    "TN": {"Tennessee Valley Authority": 0, "Nashville Electric Service": 400000, "Memphis Light Gas & Water": 450000, "Knoxville Utilities Board": 200000},
    "TX": {"Oncor Electric Delivery Co": 3700000, "CenterPoint Energy": 2600000, "AEP Texas": 1100000, "Texas-New Mexico Power Co": 250000, "Austin Energy": 500000, "CPS Energy": 870000},
    "UT": {"Rocky Mountain Power": 950000, "City of St George": 35000},
    "VT": {"Green Mountain Power Corp": 270000, "Vermont Electric Coop": 33000},
    "VA": {"Dominion Energy Virginia": 2700000, "Appalachian Power Co": 530000, "Virginia Electric & Power Co": 0},
    "WA": {"Puget Sound Energy Inc": 1200000, "Avista Corp": 260000, "Seattle City Light": 450000, "Tacoma Power": 190000, "Snohomish County PUD No 1": 350000},
    "WV": {"Appalachian Power Co": 490000, "Monongahela Power Co": 390000, "Potomac Edison Co": 125000},
    "WI": {"Wisconsin Electric Power Co": 1100000, "Wisconsin Public Service Corp": 460000, "Alliant Energy": 480000, "Madison Gas & Electric Co": 160000},
    "WY": {"Rocky Mountain Power": 135000, "Cheyenne Light Fuel & Power Co": 42000, "Black Hills Power Inc": 25000},
}

# EIA average retail electricity prices by state (2025 data, cents/kWh residential)
# Source: EIA Electric Power Monthly
EIA_STATE_AVG_RATES = {
    "AL": 0.1398, "AK": 0.2350, "AZ": 0.1305, "AR": 0.1187, "CA": 0.2737,
    "CO": 0.1412, "CT": 0.2663, "DE": 0.1432, "FL": 0.1398, "GA": 0.1323,
    "HI": 0.3878, "ID": 0.1060, "IL": 0.1547, "IN": 0.1362, "IA": 0.1397,
    "KS": 0.1390, "KY": 0.1181, "LA": 0.1133, "ME": 0.2245, "MD": 0.1566,
    "MA": 0.2837, "MI": 0.1783, "MN": 0.1407, "MS": 0.1267, "MO": 0.1262,
    "MT": 0.1194, "NE": 0.1171, "NV": 0.1285, "NH": 0.2361, "NJ": 0.1792,
    "NM": 0.1382, "NY": 0.2226, "NC": 0.1218, "ND": 0.1142, "OH": 0.1413,
    "OK": 0.1153, "OR": 0.1199, "PA": 0.1622, "RI": 0.2678, "SC": 0.1315,
    "SD": 0.1275, "TN": 0.1177, "TX": 0.1356, "UT": 0.1076, "VT": 0.2074,
    "VA": 0.1297, "WA": 0.1047, "WV": 0.1243, "WI": 0.1574, "WY": 0.1109,
}

# Net metering policies by state (2026 status)
NET_METERING_POLICIES = {
    "AL": {"has_net_metering": False, "net_metering_type": "avoided_cost", "export_rate": None},
    "AK": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "AZ": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "AR": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "CA": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": 0.05},
    "CO": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "CT": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "DE": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "FL": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "GA": {"has_net_metering": False, "net_metering_type": "none", "export_rate": None},
    "HI": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "ID": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "IL": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "IN": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "IA": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "KS": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "KY": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "LA": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "ME": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "MD": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "MA": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "MI": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "MN": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "MS": {"has_net_metering": False, "net_metering_type": "avoided_cost", "export_rate": None},
    "MO": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "MT": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "NE": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "NV": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "NH": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "NJ": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "NM": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "NY": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "NC": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "ND": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "OH": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "OK": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "OR": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "PA": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "RI": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "SC": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "SD": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "TN": {"has_net_metering": False, "net_metering_type": "avoided_cost", "export_rate": None},
    "TX": {"has_net_metering": False, "net_metering_type": "none", "export_rate": None},
    "UT": {"has_net_metering": True, "net_metering_type": "net_billing", "export_rate": None},
    "VT": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "VA": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "WA": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "WV": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "WI": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
    "WY": {"has_net_metering": True, "net_metering_type": "NEM", "export_rate": None},
}


def api_call(params, retries=3):
    """Make API call with retry logic."""
    params["api_key"] = API_KEY
    params["version"] = "8"
    params["format"] = "json"
    url = BASE_URL + "?" + urllib.parse.urlencode(params)

    for attempt in range(retries):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as e:
            if attempt < retries - 1:
                time.sleep(1 * (attempt + 1))
            else:
                print(f"  API error after {retries} attempts: {e}", file=sys.stderr)
                return None


def extract_rate_from_structure(rate_data):
    """Extract average residential rate from rate structure data."""
    # Try to calculate from energyratestructure
    if "energyratestructure" in rate_data:
        structure = rate_data["energyratestructure"]
        if structure and len(structure) > 0:
            # Get the first period (or average across periods)
            total_rate = 0
            count = 0
            for period in structure:
                if isinstance(period, list):
                    for tier in period:
                        if isinstance(tier, dict) and "rate" in tier:
                            rate = tier["rate"]
                            adj = tier.get("adj", 0)
                            total_rate += rate + adj
                            count += 1
            if count > 0:
                return round(total_rate / count, 5)

    # Try fixedmonthlycharge + per-kWh
    if "fixedmonthlycharge" in rate_data:
        # Rough estimate: fixed / 1000kWh avg + energy rate
        fixed = rate_data.get("fixedmonthlycharge", 0) or 0
        # Assume 1000 kWh average monthly usage
        fixed_per_kwh = fixed / 1000 if fixed else 0
        return round(fixed_per_kwh, 5) if fixed_per_kwh > 0 else None

    return None


def classify_rate_structure(rate_data):
    """Classify rate as flat, TOU, or tiered."""
    has_tou = False
    has_tiers = False

    # Check for TOU: different weekday vs weekend schedules or multiple periods
    weekday = rate_data.get("energyweekdayschedule", [])
    weekend = rate_data.get("energyweekendschedule", [])

    if weekday:
        # Check if there are multiple different period values in weekday schedule
        periods_used = set()
        for month in weekday:
            if isinstance(month, list):
                for val in month:
                    periods_used.add(val)
        if len(periods_used) > 1:
            has_tou = True

    # Check for tiered rates
    structure = rate_data.get("energyratestructure", [])
    if structure:
        for period in structure:
            if isinstance(period, list) and len(period) > 1:
                has_tiers = True
                break

    if has_tou:
        return "tou"
    elif has_tiers:
        return "tiered"
    else:
        return "flat"


def has_demand_charges(rate_data):
    """Check if rate has demand charges."""
    if rate_data.get("demandratestructure"):
        return True
    if rate_data.get("flatdemandstructure"):
        return True
    if rate_data.get("demandmax"):
        return True
    return False


def classify_utility_type(utility_name):
    """Classify utility as IOU, muni, or coop based on name."""
    name_lower = utility_name.lower()
    if any(kw in name_lower for kw in ["coop", "cooperative", "co-op", "emc", "ec ", "rec ", "remc"]):
        return "coop"
    if any(kw in name_lower for kw in ["city of", "municipal", "dept of", "department of", "public util",
                                         "pud", "district", "authority", "board", "town of", "village of",
                                         "cwl&p", "city light", "electric service", "utilities board"]):
        return "muni"
    return "IOU"


def fetch_utilities_for_state(state_code):
    """Fetch all utilities for a state using geographic queries."""
    query_points = STATE_QUERY_POINTS.get(state_code, [])
    known_ious = MAJOR_IOUS.get(state_code, {})

    # Track unique utilities by eiaid
    utilities_by_eia = {}

    for city_name, lat, lon in query_points:
        print(f"  Querying {city_name}, {state_code} ({lat}, {lon})...")

        # Query residential default rates with geographic search
        data = api_call({
            "sector": "Residential",
            "approved": "true",
            "is_default": "true",
            "country": "USA",
            "lat": str(lat),
            "lon": str(lon),
            "radius": "100",
            "co_limit": "30",
            "detail": "full",
            "limit": "500",
        })

        if not data or "items" not in data:
            print(f"    No data for {city_name}", file=sys.stderr)
            continue

        for item in data.get("items", []):
            eia_id = item.get("eiaid")
            utility_name = item.get("utility", "Unknown")

            if not eia_id:
                continue

            # Skip if we already have a newer rate for this utility
            existing = utilities_by_eia.get(eia_id)
            item_start = item.get("startdate", 0)

            if existing:
                if item_start > existing.get("_startdate", 0):
                    # This is a newer rate, update
                    pass
                else:
                    continue

            # Extract rate info
            avg_rate = extract_rate_from_structure(item)
            rate_structure = classify_rate_structure(item)
            demand = has_demand_charges(item)
            util_type = classify_utility_type(utility_name)

            # Get customer count from known IOUs or estimate
            customer_count = known_ious.get(utility_name, 0)
            if customer_count == 0:
                # Try partial match
                for known_name, count in known_ious.items():
                    if known_name.lower() in utility_name.lower() or utility_name.lower() in known_name.lower():
                        customer_count = count
                        break

            # Net metering info from state-level data
            nm_info = NET_METERING_POLICIES.get(state_code, {
                "has_net_metering": False,
                "net_metering_type": "none",
                "export_rate": None
            })

            # If we couldn't extract rate from structure, use EIA state average
            if avg_rate is None or avg_rate < 0.01 or avg_rate > 1.0:
                avg_rate = EIA_STATE_AVG_RATES.get(state_code, 0.13)

            utilities_by_eia[eia_id] = {
                "utility_id": str(eia_id),
                "utility_name": utility_name,
                "state": state_code,
                "states_served": [state_code],
                "type": util_type,
                "customer_count": customer_count,
                "residential_avg_rate": round(avg_rate, 4),
                "rate_structure": rate_structure,
                "has_net_metering": nm_info.get("has_net_metering", False),
                "net_metering_type": nm_info.get("net_metering_type", "none"),
                "export_rate": nm_info.get("export_rate"),
                "tou_available": rate_structure == "tou",
                "demand_charges": demand,
                "updated_at": datetime.now().strftime("%Y-%m-%d"),
                "_startdate": item_start,
                "_rate_name": item.get("name", ""),
                "_source": item.get("source", ""),
            }

        # Be nice to the API
        time.sleep(0.3)

    # Add any known IOUs that weren't found via geographic search
    for iou_name, customer_count in known_ious.items():
        if customer_count == 0:
            continue
        found = any(
            iou_name.lower() in u["utility_name"].lower() or u["utility_name"].lower() in iou_name.lower()
            for u in utilities_by_eia.values()
        )
        if not found:
            # Try direct utility name search
            print(f"  Searching directly for: {iou_name}...")
            data = api_call({
                "ratesforutility": iou_name,
                "sector": "Residential",
                "approved": "true",
                "detail": "full",
                "limit": "10",
                "orderby": "startdate",
                "direction": "desc",
            })

            if data and "items" in data and len(data["items"]) > 0:
                item = data["items"][0]
                eia_id = item.get("eiaid", hash(iou_name))
                avg_rate = extract_rate_from_structure(item)

                if avg_rate is None or avg_rate < 0.01 or avg_rate > 1.0:
                    avg_rate = EIA_STATE_AVG_RATES.get(state_code, 0.13)

                nm_info = NET_METERING_POLICIES.get(state_code, {})

                utilities_by_eia[eia_id] = {
                    "utility_id": str(eia_id),
                    "utility_name": iou_name,
                    "state": state_code,
                    "states_served": [state_code],
                    "type": classify_utility_type(iou_name),
                    "customer_count": customer_count,
                    "residential_avg_rate": round(avg_rate, 4),
                    "rate_structure": classify_rate_structure(item),
                    "has_net_metering": nm_info.get("has_net_metering", False),
                    "net_metering_type": nm_info.get("net_metering_type", "none"),
                    "export_rate": nm_info.get("export_rate"),
                    "tou_available": classify_rate_structure(item) == "tou",
                    "demand_charges": has_demand_charges(item),
                    "updated_at": datetime.now().strftime("%Y-%m-%d"),
                    "_startdate": item.get("startdate", 0),
                    "_rate_name": item.get("name", ""),
                    "_source": item.get("source", ""),
                }
            else:
                # Add from known data with state average rate
                nm_info = NET_METERING_POLICIES.get(state_code, {})
                utilities_by_eia[hash(iou_name)] = {
                    "utility_id": str(hash(iou_name)),
                    "utility_name": iou_name,
                    "state": state_code,
                    "states_served": [state_code],
                    "type": classify_utility_type(iou_name),
                    "customer_count": customer_count,
                    "residential_avg_rate": EIA_STATE_AVG_RATES.get(state_code, 0.13),
                    "rate_structure": "tiered",
                    "has_net_metering": nm_info.get("has_net_metering", False),
                    "net_metering_type": nm_info.get("net_metering_type", "none"),
                    "export_rate": nm_info.get("export_rate"),
                    "tou_available": False,
                    "demand_charges": False,
                    "updated_at": datetime.now().strftime("%Y-%m-%d"),
                    "_startdate": 0,
                    "_rate_name": "Estimated",
                    "_source": "EIA-861",
                }
            time.sleep(0.3)

    # Clean up internal fields and sort by customer count
    results = []
    for u in utilities_by_eia.values():
        clean = {k: v for k, v in u.items() if not k.startswith("_")}
        results.append(clean)

    results.sort(key=lambda x: x.get("customer_count", 0), reverse=True)
    return results


def main():
    if not API_KEY:
        print("Usage: python3 fetch_utility_rates.py <NREL_API_KEY>", file=sys.stderr)
        sys.exit(1)

    os.makedirs(STATES_DIR, exist_ok=True)

    all_utilities = []
    state_summary = {}

    states = sorted(STATE_QUERY_POINTS.keys())
    total_states = len(states)

    for i, state in enumerate(states):
        print(f"\n[{i+1}/{total_states}] Processing {state}...")

        utilities = fetch_utilities_for_state(state)

        # Save state file
        state_file = os.path.join(STATES_DIR, f"{state}.json")
        state_data = {
            "state": state,
            "utility_count": len(utilities),
            "avg_residential_rate": round(
                sum(u["residential_avg_rate"] for u in utilities) / max(len(utilities), 1), 4
            ),
            "eia_state_avg_rate": EIA_STATE_AVG_RATES.get(state, 0),
            "net_metering": NET_METERING_POLICIES.get(state, {}),
            "utilities": utilities,
            "fetched_at": datetime.now().isoformat(),
        }

        with open(state_file, "w") as f:
            json.dump(state_data, f, indent=2)

        all_utilities.extend(utilities)
        state_summary[state] = {
            "utility_count": len(utilities),
            "avg_rate": state_data["avg_residential_rate"],
            "eia_avg_rate": EIA_STATE_AVG_RATES.get(state, 0),
        }

        print(f"  Found {len(utilities)} utilities, avg rate: ${state_data['avg_residential_rate']}/kWh")

    # Save national file
    national_file = os.path.join(OUTPUT_DIR, "national_utility_rates.json")
    national_data = {
        "total_utilities": len(all_utilities),
        "states_covered": len(state_summary),
        "national_avg_rate": round(
            sum(EIA_STATE_AVG_RATES.values()) / len(EIA_STATE_AVG_RATES), 4
        ),
        "state_summary": state_summary,
        "utilities": all_utilities,
        "fetched_at": datetime.now().isoformat(),
        "source": "OpenEI USURDB + EIA-861",
    }

    with open(national_file, "w") as f:
        json.dump(national_data, f, indent=2)

    print(f"\n{'='*60}")
    print(f"COMPLETE: {len(all_utilities)} utilities across {len(state_summary)} states")
    print(f"National avg rate: ${national_data['national_avg_rate']}/kWh")
    print(f"Files saved to: {OUTPUT_DIR}")
    print(f"  - national_utility_rates.json")
    print(f"  - states/*.json (50 files)")


if __name__ == "__main__":
    main()
