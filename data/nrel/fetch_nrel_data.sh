#!/bin/bash
# Fetch NREL PVWatts data for major cities across all 50 states
# System: 8kW, azimuth=180, tilt=20, array_type=1, module_type=1, losses=14

API_KEY="u6TjpQ8OkD2Nrv1hthjFKaRiYaXyz5tSYyqyrT9G"
OUTPUT_DIR="/Users/justingriffith/projects/solar-crm/data/nrel"
RESULT_FILE="$OUTPUT_DIR/national_solar_resource.json"

echo '{"generated_at":"2026-02-08","source":"NREL PVWatts v8","system_capacity_kw":8,"states":{' > "$RESULT_FILE"

# Define cities: STATE|CITY|LAT|LON
CITIES=(
"AL|Birmingham|33.52|-86.80"
"AL|Mobile|30.69|-88.04"
"AL|Huntsville|34.73|-86.59"
"AK|Anchorage|61.22|-149.90"
"AK|Fairbanks|64.84|-147.72"
"AZ|Phoenix|33.45|-112.07"
"AZ|Tucson|32.22|-110.93"
"AZ|Mesa|33.42|-111.83"
"AR|Little Rock|34.75|-92.29"
"AR|Fayetteville|36.06|-94.16"
"CA|Los Angeles|34.05|-118.24"
"CA|San Diego|32.72|-117.16"
"CA|San Jose|37.34|-121.89"
"CA|Sacramento|38.58|-121.49"
"CO|Denver|39.74|-104.99"
"CO|Colorado Springs|38.83|-104.82"
"CT|Hartford|41.76|-72.68"
"CT|New Haven|41.31|-72.93"
"DE|Wilmington|39.74|-75.55"
"DE|Dover|39.16|-75.52"
"FL|Miami|25.76|-80.19"
"FL|Tampa|27.95|-82.46"
"FL|Orlando|28.54|-81.38"
"FL|Jacksonville|30.33|-81.66"
"GA|Atlanta|33.75|-84.39"
"GA|Savannah|32.08|-81.09"
"HI|Honolulu|21.31|-157.86"
"HI|Hilo|19.72|-155.08"
"ID|Boise|43.62|-116.21"
"ID|Meridian|43.61|-116.39"
"IL|Chicago|41.88|-87.63"
"IL|Springfield|39.78|-89.65"
"IN|Indianapolis|39.77|-86.16"
"IN|Fort Wayne|41.08|-85.14"
"IA|Des Moines|41.59|-93.62"
"IA|Cedar Rapids|42.03|-91.64"
"KS|Wichita|37.69|-97.34"
"KS|Kansas City|39.11|-94.63"
"KY|Louisville|38.25|-85.76"
"KY|Lexington|38.04|-84.50"
"LA|New Orleans|29.95|-90.07"
"LA|Baton Rouge|30.45|-91.19"
"ME|Portland|43.66|-70.26"
"ME|Bangor|44.80|-68.77"
"MD|Baltimore|39.29|-76.61"
"MD|Rockville|39.08|-77.15"
"MA|Boston|42.36|-71.06"
"MA|Worcester|42.26|-71.80"
"MI|Detroit|42.33|-83.05"
"MI|Grand Rapids|42.96|-85.66"
"MN|Minneapolis|44.98|-93.27"
"MN|Rochester|44.02|-92.47"
"MS|Jackson|32.30|-90.18"
"MS|Gulfport|30.37|-89.09"
"MO|Kansas City|39.10|-94.58"
"MO|St Louis|38.63|-90.20"
"MT|Billings|45.78|-108.50"
"MT|Missoula|46.87|-114.00"
"NE|Omaha|41.26|-95.94"
"NE|Lincoln|40.81|-96.70"
"NV|Las Vegas|36.17|-115.14"
"NV|Reno|39.53|-119.81"
"NH|Manchester|42.99|-71.46"
"NH|Concord|43.21|-71.54"
"NJ|Newark|40.74|-74.17"
"NJ|Trenton|40.22|-74.76"
"NM|Albuquerque|35.08|-106.65"
"NM|Las Cruces|32.35|-106.76"
"NY|New York|40.71|-74.01"
"NY|Buffalo|42.89|-78.88"
"NY|Albany|42.65|-73.76"
"NC|Charlotte|35.23|-80.84"
"NC|Raleigh|35.78|-78.64"
"ND|Fargo|46.88|-96.79"
"ND|Bismarck|46.81|-100.78"
"OH|Columbus|39.96|-82.99"
"OH|Cleveland|41.50|-81.69"
"OH|Cincinnati|39.10|-84.51"
"OK|Oklahoma City|35.47|-97.52"
"OK|Tulsa|36.15|-95.99"
"OR|Portland|45.52|-122.68"
"OR|Salem|44.94|-123.04"
"PA|Philadelphia|39.95|-75.17"
"PA|Pittsburgh|40.44|-79.99"
"RI|Providence|41.82|-71.41"
"SC|Charleston|32.78|-79.93"
"SC|Columbia|34.00|-81.03"
"SD|Sioux Falls|43.55|-96.73"
"SD|Rapid City|44.08|-103.23"
"TN|Nashville|36.16|-86.78"
"TN|Memphis|35.15|-90.05"
"TX|Houston|29.76|-95.37"
"TX|Dallas|32.78|-96.80"
"TX|Austin|30.27|-97.74"
"TX|San Antonio|29.42|-98.49"
"UT|Salt Lake City|40.76|-111.89"
"UT|Provo|40.23|-111.66"
"VT|Burlington|44.48|-73.21"
"VA|Richmond|37.54|-77.44"
"VA|Virginia Beach|36.85|-75.98"
"WA|Seattle|47.61|-122.33"
"WA|Spokane|47.66|-117.43"
"WV|Charleston|38.35|-81.63"
"WI|Milwaukee|43.04|-87.91"
"WI|Madison|43.07|-89.40"
"WY|Cheyenne|41.14|-104.82"
"WY|Casper|42.87|-106.31"
)

FIRST_STATE=true
CURRENT_STATE=""
FIRST_CITY=true

for entry in "${CITIES[@]}"; do
    IFS='|' read -r state city lat lon <<< "$entry"

    if [ "$state" != "$CURRENT_STATE" ]; then
        if [ "$CURRENT_STATE" != "" ]; then
            echo '}}' >> "$RESULT_FILE"  # close previous state cities + state
            echo ',' >> "$RESULT_FILE"
        fi
        CURRENT_STATE="$state"
        FIRST_CITY=true
        echo "\"$state\":{\"cities\":{" >> "$RESULT_FILE"
    fi

    if [ "$FIRST_CITY" = false ]; then
        echo ',' >> "$RESULT_FILE"
    fi
    FIRST_CITY=false

    echo "  Fetching: $state - $city ($lat, $lon)..."

    RESPONSE=$(curl -s "https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${API_KEY}&lat=${lat}&lon=${lon}&system_capacity=8&azimuth=180&tilt=20&array_type=1&module_type=1&losses=14" 2>/dev/null)

    # Extract key values
    AC_ANNUAL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['outputs']['ac_annual'])" 2>/dev/null || echo "null")
    SOLRAD=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['outputs']['solrad_annual'])" 2>/dev/null || echo "null")
    CF=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['outputs']['capacity_factor'])" 2>/dev/null || echo "null")
    AC_MONTHLY=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d['outputs']['ac_monthly']))" 2>/dev/null || echo "[]")
    SOLRAD_MONTHLY=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d['outputs']['solrad_monthly']))" 2>/dev/null || echo "[]")

    cat >> "$RESULT_FILE" << CITYEOF
"$city":{"lat":$lat,"lon":$lon,"ac_annual_kwh":$AC_ANNUAL,"solrad_annual":$SOLRAD,"capacity_factor":$CF,"ac_monthly":$AC_MONTHLY,"solrad_monthly":$SOLRAD_MONTHLY}
CITYEOF

    # Rate limit: 1 request per second
    sleep 0.5
done

# Close last state and root
echo '}}' >> "$RESULT_FILE"
echo '}}' >> "$RESULT_FILE"

echo ""
echo "Done! Saved to $RESULT_FILE"
echo "Total cities: ${#CITIES[@]}"
