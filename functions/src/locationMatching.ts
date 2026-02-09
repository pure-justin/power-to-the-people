/**
 * Location Matching — Geo Utilities for SolarOS Marketplace
 *
 * Matches workers to projects by zip code + radius using haversine distance.
 * Provides zip-to-coordinate lookup (Firestore cache + inline table of ~350
 * real US metro zip codes), distance calculation, and worker proximity search.
 *
 * Collections read:
 *   zip_coordinates    — Cached zip code coordinate data
 *   workers            — Worker profiles (skills, location, availability)
 *
 * @module locationMatching
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Coordinate + location info for a US zip code */
export interface ZipCoordinates {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

/** A worker matched to a project by proximity */
export interface WorkerMatch {
  workerId: string;
  distance: number;
  worker: Record<string, unknown>;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Earth's mean radius in miles */
const EARTH_RADIUS_MILES = 3958.8;

/** Default search radius in miles */
const DEFAULT_RADIUS_MILES = 50;

// ─── Inline Zip Code Table ──────────────────────────────────────────────────────
//
// ~350 real US zip codes covering all 50 states + DC, focused on major metros.
// Used as fallback when Firestore cache misses.

const ZIP_TABLE: Record<
  string,
  { lat: number; lng: number; city: string; state: string }
> = {
  // Alabama
  "35203": { lat: 33.5186, lng: -86.8104, city: "Birmingham", state: "AL" },
  "35801": { lat: 34.7304, lng: -86.5861, city: "Huntsville", state: "AL" },
  "36104": { lat: 32.3792, lng: -86.3077, city: "Montgomery", state: "AL" },
  "36602": { lat: 30.6954, lng: -88.0399, city: "Mobile", state: "AL" },
  // Alaska
  "99501": { lat: 61.2181, lng: -149.9003, city: "Anchorage", state: "AK" },
  "99701": { lat: 64.8378, lng: -147.7164, city: "Fairbanks", state: "AK" },
  "99801": { lat: 58.3005, lng: -134.4197, city: "Juneau", state: "AK" },
  // Arizona
  "85001": { lat: 33.4484, lng: -112.074, city: "Phoenix", state: "AZ" },
  "85201": { lat: 33.4148, lng: -111.8315, city: "Mesa", state: "AZ" },
  "85224": { lat: 33.3284, lng: -111.8601, city: "Chandler", state: "AZ" },
  "85233": { lat: 33.3527, lng: -111.8345, city: "Gilbert", state: "AZ" },
  "85251": { lat: 33.4928, lng: -111.9206, city: "Scottsdale", state: "AZ" },
  "85254": { lat: 33.6064, lng: -111.9471, city: "Scottsdale", state: "AZ" },
  "85281": { lat: 33.4255, lng: -111.94, city: "Tempe", state: "AZ" },
  "85282": { lat: 33.3942, lng: -111.9291, city: "Tempe", state: "AZ" },
  "85301": { lat: 33.5092, lng: -112.1858, city: "Glendale", state: "AZ" },
  "85701": { lat: 32.2217, lng: -110.9265, city: "Tucson", state: "AZ" },
  "86001": { lat: 35.1983, lng: -111.6513, city: "Flagstaff", state: "AZ" },
  // Arkansas
  "72201": { lat: 34.7465, lng: -92.2896, city: "Little Rock", state: "AR" },
  "72401": { lat: 35.8423, lng: -90.7043, city: "Jonesboro", state: "AR" },
  "72701": { lat: 36.0822, lng: -94.1719, city: "Fayetteville", state: "AR" },
  // California
  "90001": { lat: 33.9425, lng: -118.2551, city: "Los Angeles", state: "CA" },
  "90012": { lat: 34.0622, lng: -118.2395, city: "Los Angeles", state: "CA" },
  "90036": { lat: 34.0696, lng: -118.3468, city: "Los Angeles", state: "CA" },
  "90045": { lat: 33.9562, lng: -118.3918, city: "Los Angeles", state: "CA" },
  "90210": { lat: 34.0901, lng: -118.4065, city: "Beverly Hills", state: "CA" },
  "90230": { lat: 33.9952, lng: -118.3952, city: "Culver City", state: "CA" },
  "90401": { lat: 34.0195, lng: -118.4912, city: "Santa Monica", state: "CA" },
  "90501": { lat: 33.8339, lng: -118.3269, city: "Torrance", state: "CA" },
  "90802": { lat: 33.7675, lng: -118.196, city: "Long Beach", state: "CA" },
  "91101": { lat: 34.1478, lng: -118.1445, city: "Pasadena", state: "CA" },
  "91201": { lat: 34.1425, lng: -118.2551, city: "Glendale", state: "CA" },
  "91301": { lat: 34.1581, lng: -118.6015, city: "Agoura Hills", state: "CA" },
  "91401": { lat: 34.1819, lng: -118.4487, city: "Van Nuys", state: "CA" },
  "91601": {
    lat: 34.167,
    lng: -118.3676,
    city: "North Hollywood",
    state: "CA",
  },
  "91901": { lat: 32.8401, lng: -116.7667, city: "Alpine", state: "CA" },
  "92009": { lat: 33.0772, lng: -117.2696, city: "Carlsbad", state: "CA" },
  "92101": { lat: 32.7197, lng: -117.1628, city: "San Diego", state: "CA" },
  "92109": { lat: 32.7968, lng: -117.2374, city: "San Diego", state: "CA" },
  "92201": { lat: 33.7175, lng: -116.2146, city: "Indio", state: "CA" },
  "92260": { lat: 33.7394, lng: -116.3753, city: "Palm Desert", state: "CA" },
  "92612": { lat: 33.6846, lng: -117.8265, city: "Irvine", state: "CA" },
  "92677": { lat: 33.6012, lng: -117.6782, city: "Laguna Niguel", state: "CA" },
  "92801": { lat: 33.8366, lng: -117.9143, city: "Anaheim", state: "CA" },
  "93065": { lat: 34.2825, lng: -118.6891, city: "Simi Valley", state: "CA" },
  "93101": { lat: 34.4208, lng: -119.6982, city: "Santa Barbara", state: "CA" },
  "93301": { lat: 35.3733, lng: -119.0187, city: "Bakersfield", state: "CA" },
  "93401": {
    lat: 35.2828,
    lng: -120.6596,
    city: "San Luis Obispo",
    state: "CA",
  },
  "93721": { lat: 36.7378, lng: -119.7871, city: "Fresno", state: "CA" },
  "94043": { lat: 37.3861, lng: -122.0839, city: "Mountain View", state: "CA" },
  "94102": { lat: 37.7813, lng: -122.4167, city: "San Francisco", state: "CA" },
  "94105": { lat: 37.7893, lng: -122.3932, city: "San Francisco", state: "CA" },
  "94301": { lat: 37.4419, lng: -122.143, city: "Palo Alto", state: "CA" },
  "94539": { lat: 37.5093, lng: -121.9289, city: "Fremont", state: "CA" },
  "94601": { lat: 37.7749, lng: -122.2194, city: "Oakland", state: "CA" },
  "95014": { lat: 37.323, lng: -122.0322, city: "Cupertino", state: "CA" },
  "95051": { lat: 37.3497, lng: -121.9836, city: "Santa Clara", state: "CA" },
  "95101": { lat: 37.3382, lng: -121.8863, city: "San Jose", state: "CA" },
  "95401": { lat: 38.4469, lng: -122.7144, city: "Santa Rosa", state: "CA" },
  "95814": { lat: 38.5816, lng: -121.4944, city: "Sacramento", state: "CA" },
  // Colorado
  "80112": { lat: 39.5802, lng: -104.876, city: "Englewood", state: "CO" },
  "80202": { lat: 39.7392, lng: -104.9903, city: "Denver", state: "CO" },
  "80204": { lat: 39.735, lng: -105.0206, city: "Denver", state: "CO" },
  "80210": { lat: 39.6797, lng: -104.965, city: "Denver", state: "CO" },
  "80220": { lat: 39.7296, lng: -104.9178, city: "Denver", state: "CO" },
  "80301": { lat: 40.015, lng: -105.2705, city: "Boulder", state: "CO" },
  "80401": { lat: 39.7474, lng: -105.2103, city: "Golden", state: "CO" },
  "80525": { lat: 40.5508, lng: -105.0668, city: "Fort Collins", state: "CO" },
  "80901": {
    lat: 38.8339,
    lng: -104.8214,
    city: "Colorado Springs",
    state: "CO",
  },
  "81001": { lat: 38.2544, lng: -104.6091, city: "Pueblo", state: "CO" },
  // Connecticut
  "06103": { lat: 41.7658, lng: -72.6734, city: "Hartford", state: "CT" },
  "06510": { lat: 41.3083, lng: -72.9279, city: "New Haven", state: "CT" },
  "06601": { lat: 41.1865, lng: -73.1952, city: "Bridgeport", state: "CT" },
  "06901": { lat: 41.0534, lng: -73.5387, city: "Stamford", state: "CT" },
  // Delaware
  "19801": { lat: 39.7391, lng: -75.5398, city: "Wilmington", state: "DE" },
  "19901": { lat: 39.1582, lng: -75.5244, city: "Dover", state: "DE" },
  // District of Columbia
  "20001": { lat: 38.9072, lng: -77.0169, city: "Washington", state: "DC" },
  "20005": { lat: 38.9022, lng: -77.0316, city: "Washington", state: "DC" },
  "20037": { lat: 38.9009, lng: -77.0517, city: "Washington", state: "DC" },
  // Florida
  "32202": { lat: 30.3322, lng: -81.6557, city: "Jacksonville", state: "FL" },
  "32256": { lat: 30.2079, lng: -81.5557, city: "Jacksonville", state: "FL" },
  "32301": { lat: 30.4383, lng: -84.2807, city: "Tallahassee", state: "FL" },
  "32608": { lat: 29.6316, lng: -82.3939, city: "Gainesville", state: "FL" },
  "32801": { lat: 28.5383, lng: -81.3792, city: "Orlando", state: "FL" },
  "33065": { lat: 26.2034, lng: -80.2694, city: "Coral Springs", state: "FL" },
  "33101": { lat: 25.7617, lng: -80.1918, city: "Miami", state: "FL" },
  "33143": { lat: 25.7034, lng: -80.2895, city: "Miami", state: "FL" },
  "33160": {
    lat: 25.9282,
    lng: -80.1263,
    city: "North Miami Beach",
    state: "FL",
  },
  "33301": {
    lat: 26.1224,
    lng: -80.1373,
    city: "Fort Lauderdale",
    state: "FL",
  },
  "33309": {
    lat: 26.1865,
    lng: -80.1722,
    city: "Fort Lauderdale",
    state: "FL",
  },
  "33401": {
    lat: 26.7153,
    lng: -80.0534,
    city: "West Palm Beach",
    state: "FL",
  },
  "33602": { lat: 27.9506, lng: -82.4572, city: "Tampa", state: "FL" },
  "33701": {
    lat: 27.7676,
    lng: -82.6413,
    city: "Saint Petersburg",
    state: "FL",
  },
  "33901": { lat: 26.6406, lng: -81.8723, city: "Fort Myers", state: "FL" },
  "34102": { lat: 26.142, lng: -81.7948, city: "Naples", state: "FL" },
  "34201": { lat: 27.3364, lng: -82.5307, city: "Bradenton", state: "FL" },
  "34236": { lat: 27.327, lng: -82.5448, city: "Sarasota", state: "FL" },
  "34741": { lat: 28.3025, lng: -81.4257, city: "Kissimmee", state: "FL" },
  // Georgia
  "30033": { lat: 33.8048, lng: -84.2843, city: "Decatur", state: "GA" },
  "30060": { lat: 33.9519, lng: -84.5421, city: "Marietta", state: "GA" },
  "30075": { lat: 34.0264, lng: -84.3623, city: "Roswell", state: "GA" },
  "30301": { lat: 33.749, lng: -84.388, city: "Atlanta", state: "GA" },
  "30305": { lat: 33.836, lng: -84.3873, city: "Atlanta", state: "GA" },
  "30309": { lat: 33.7923, lng: -84.381, city: "Atlanta", state: "GA" },
  "30318": { lat: 33.7928, lng: -84.4377, city: "Atlanta", state: "GA" },
  "30601": { lat: 33.9519, lng: -83.3576, city: "Athens", state: "GA" },
  "30901": { lat: 33.4735, lng: -81.9748, city: "Augusta", state: "GA" },
  "31201": { lat: 32.8407, lng: -83.6324, city: "Macon", state: "GA" },
  "31401": { lat: 32.0809, lng: -81.0912, city: "Savannah", state: "GA" },
  // Hawaii
  "96720": { lat: 19.7241, lng: -155.0868, city: "Hilo", state: "HI" },
  "96740": { lat: 19.64, lng: -155.9969, city: "Kailua-Kona", state: "HI" },
  "96801": { lat: 21.3069, lng: -157.8583, city: "Honolulu", state: "HI" },
  // Idaho
  "83201": { lat: 42.8713, lng: -112.4455, city: "Pocatello", state: "ID" },
  "83301": { lat: 42.5558, lng: -114.4601, city: "Twin Falls", state: "ID" },
  "83701": { lat: 43.615, lng: -116.2023, city: "Boise", state: "ID" },
  // Illinois
  "60005": {
    lat: 42.0855,
    lng: -87.9806,
    city: "Arlington Heights",
    state: "IL",
  },
  "60007": {
    lat: 42.028,
    lng: -87.9986,
    city: "Elk Grove Village",
    state: "IL",
  },
  "60201": { lat: 42.0451, lng: -87.6877, city: "Evanston", state: "IL" },
  "60540": { lat: 41.7712, lng: -88.1554, city: "Naperville", state: "IL" },
  "60601": { lat: 41.8819, lng: -87.6278, city: "Chicago", state: "IL" },
  "60606": { lat: 41.8783, lng: -87.6345, city: "Chicago", state: "IL" },
  "60611": { lat: 41.8925, lng: -87.6244, city: "Chicago", state: "IL" },
  "60613": { lat: 41.9522, lng: -87.6564, city: "Chicago", state: "IL" },
  "60614": { lat: 41.9219, lng: -87.649, city: "Chicago", state: "IL" },
  "60625": { lat: 41.972, lng: -87.7007, city: "Chicago", state: "IL" },
  "60640": { lat: 41.9717, lng: -87.6618, city: "Chicago", state: "IL" },
  "60657": { lat: 41.94, lng: -87.653, city: "Chicago", state: "IL" },
  "61101": { lat: 42.2711, lng: -89.094, city: "Rockford", state: "IL" },
  "61602": { lat: 40.6936, lng: -89.589, city: "Peoria", state: "IL" },
  "62701": { lat: 39.7817, lng: -89.6501, city: "Springfield", state: "IL" },
  // Indiana
  "46201": { lat: 39.7684, lng: -86.1581, city: "Indianapolis", state: "IN" },
  "46601": { lat: 41.6764, lng: -86.252, city: "South Bend", state: "IN" },
  "46801": { lat: 41.0793, lng: -85.1394, city: "Fort Wayne", state: "IN" },
  "47401": { lat: 39.1653, lng: -86.5264, city: "Bloomington", state: "IN" },
  // Iowa
  "50301": { lat: 41.5868, lng: -93.625, city: "Des Moines", state: "IA" },
  "52240": { lat: 41.6611, lng: -91.5302, city: "Iowa City", state: "IA" },
  "52401": { lat: 41.9779, lng: -91.6656, city: "Cedar Rapids", state: "IA" },
  // Kansas
  "66044": { lat: 38.9717, lng: -95.2353, city: "Lawrence", state: "KS" },
  "66101": { lat: 39.1142, lng: -94.6275, city: "Kansas City", state: "KS" },
  "66502": { lat: 39.1836, lng: -96.5717, city: "Manhattan", state: "KS" },
  "67202": { lat: 37.6872, lng: -97.3301, city: "Wichita", state: "KS" },
  // Kentucky
  "40202": { lat: 38.2542, lng: -85.7585, city: "Louisville", state: "KY" },
  "40502": { lat: 38.0406, lng: -84.5037, city: "Lexington", state: "KY" },
  "41011": { lat: 39.0837, lng: -84.5086, city: "Covington", state: "KY" },
  // Louisiana
  "70112": { lat: 29.9511, lng: -90.0715, city: "New Orleans", state: "LA" },
  "70501": { lat: 30.2241, lng: -92.0198, city: "Lafayette", state: "LA" },
  "70801": { lat: 30.4515, lng: -91.1871, city: "Baton Rouge", state: "LA" },
  "71101": { lat: 32.5252, lng: -93.7502, city: "Shreveport", state: "LA" },
  // Maine
  "04101": { lat: 43.6591, lng: -70.2568, city: "Portland", state: "ME" },
  "04401": { lat: 44.8012, lng: -68.7778, city: "Bangor", state: "ME" },
  // Maryland
  "20814": { lat: 39.0025, lng: -77.1008, city: "Bethesda", state: "MD" },
  "20850": { lat: 39.084, lng: -77.1528, city: "Rockville", state: "MD" },
  "20901": { lat: 39.0118, lng: -77.0268, city: "Silver Spring", state: "MD" },
  "21044": { lat: 39.2137, lng: -76.8794, city: "Columbia", state: "MD" },
  "21201": { lat: 39.2904, lng: -76.6122, city: "Baltimore", state: "MD" },
  "21401": { lat: 38.9784, lng: -76.4922, city: "Annapolis", state: "MD" },
  // Massachusetts
  "01101": { lat: 42.1015, lng: -72.5898, city: "Springfield", state: "MA" },
  "01602": { lat: 42.2626, lng: -71.8023, city: "Worcester", state: "MA" },
  "02101": { lat: 42.3601, lng: -71.0589, city: "Boston", state: "MA" },
  "02108": { lat: 42.3579, lng: -71.0677, city: "Boston", state: "MA" },
  "02116": { lat: 42.3498, lng: -71.0773, city: "Boston", state: "MA" },
  "02134": { lat: 42.3552, lng: -71.1315, city: "Allston", state: "MA" },
  "02139": { lat: 42.3736, lng: -71.1097, city: "Cambridge", state: "MA" },
  // Michigan
  "48104": { lat: 42.2808, lng: -83.743, city: "Ann Arbor", state: "MI" },
  "48201": { lat: 42.3314, lng: -83.0458, city: "Detroit", state: "MI" },
  "48226": { lat: 42.3314, lng: -83.0458, city: "Detroit", state: "MI" },
  "48301": {
    lat: 42.542,
    lng: -83.2219,
    city: "Bloomfield Hills",
    state: "MI",
  },
  "48335": {
    lat: 42.4614,
    lng: -83.3759,
    city: "Farmington Hills",
    state: "MI",
  },
  "48823": { lat: 42.7325, lng: -84.5555, city: "East Lansing", state: "MI" },
  "49007": { lat: 42.2917, lng: -85.5872, city: "Kalamazoo", state: "MI" },
  "49503": { lat: 42.9634, lng: -85.6681, city: "Grand Rapids", state: "MI" },
  // Minnesota
  "55101": { lat: 44.9537, lng: -93.09, city: "Saint Paul", state: "MN" },
  "55113": { lat: 45.0135, lng: -93.1583, city: "Roseville", state: "MN" },
  "55401": { lat: 44.9778, lng: -93.265, city: "Minneapolis", state: "MN" },
  "55403": { lat: 44.9686, lng: -93.2808, city: "Minneapolis", state: "MN" },
  "55408": { lat: 44.9481, lng: -93.2884, city: "Minneapolis", state: "MN" },
  "55802": { lat: 46.7867, lng: -92.1005, city: "Duluth", state: "MN" },
  "55901": { lat: 44.0121, lng: -92.4802, city: "Rochester", state: "MN" },
  // Mississippi
  "38801": { lat: 34.2576, lng: -88.7034, city: "Tupelo", state: "MS" },
  "39201": { lat: 32.2988, lng: -90.1848, city: "Jackson", state: "MS" },
  "39501": { lat: 30.396, lng: -89.0928, city: "Gulfport", state: "MS" },
  // Missouri
  "63101": { lat: 38.627, lng: -90.1994, city: "Saint Louis", state: "MO" },
  "63108": { lat: 38.6448, lng: -90.2587, city: "Saint Louis", state: "MO" },
  "63110": { lat: 38.6178, lng: -90.2569, city: "Saint Louis", state: "MO" },
  "64101": { lat: 39.0997, lng: -94.5786, city: "Kansas City", state: "MO" },
  "64110": { lat: 39.036, lng: -94.5721, city: "Kansas City", state: "MO" },
  "65201": { lat: 38.9517, lng: -92.3341, city: "Columbia", state: "MO" },
  "65801": { lat: 37.209, lng: -93.2923, city: "Springfield", state: "MO" },
  // Montana
  "59101": { lat: 45.7833, lng: -108.5007, city: "Billings", state: "MT" },
  "59601": { lat: 46.5884, lng: -112.0245, city: "Helena", state: "MT" },
  "59801": { lat: 46.8721, lng: -113.994, city: "Missoula", state: "MT" },
  // Nebraska
  "68102": { lat: 41.2565, lng: -95.9345, city: "Omaha", state: "NE" },
  "68501": { lat: 40.8136, lng: -96.7026, city: "Lincoln", state: "NE" },
  // Nevada
  "89002": { lat: 35.9787, lng: -114.9811, city: "Henderson", state: "NV" },
  "89101": { lat: 36.1699, lng: -115.1398, city: "Las Vegas", state: "NV" },
  "89109": { lat: 36.1244, lng: -115.1681, city: "Las Vegas", state: "NV" },
  "89121": { lat: 36.1192, lng: -115.0909, city: "Las Vegas", state: "NV" },
  "89145": { lat: 36.1838, lng: -115.2654, city: "Las Vegas", state: "NV" },
  "89501": { lat: 39.5296, lng: -119.8138, city: "Reno", state: "NV" },
  "89701": { lat: 39.1638, lng: -119.7674, city: "Carson City", state: "NV" },
  // New Hampshire
  "03101": { lat: 42.9956, lng: -71.4548, city: "Manchester", state: "NH" },
  "03301": { lat: 43.2081, lng: -71.5376, city: "Concord", state: "NH" },
  "03801": { lat: 43.0718, lng: -70.7626, city: "Portsmouth", state: "NH" },
  // New Jersey
  "07030": { lat: 40.744, lng: -74.0324, city: "Hoboken", state: "NJ" },
  "07078": { lat: 40.7256, lng: -74.259, city: "Short Hills", state: "NJ" },
  "07102": { lat: 40.7357, lng: -74.1724, city: "Newark", state: "NJ" },
  "07302": { lat: 40.7178, lng: -74.0431, city: "Jersey City", state: "NJ" },
  "07960": { lat: 40.7678, lng: -74.4815, city: "Morristown", state: "NJ" },
  "08401": { lat: 39.3643, lng: -74.4229, city: "Atlantic City", state: "NJ" },
  "08601": { lat: 40.2171, lng: -74.7429, city: "Trenton", state: "NJ" },
  "08901": { lat: 40.4862, lng: -74.4518, city: "New Brunswick", state: "NJ" },
  // New Mexico
  "87101": { lat: 35.0844, lng: -106.6504, city: "Albuquerque", state: "NM" },
  "87501": { lat: 35.687, lng: -105.9378, city: "Santa Fe", state: "NM" },
  "88001": { lat: 32.3199, lng: -106.7637, city: "Las Cruces", state: "NM" },
  // New York
  "10001": { lat: 40.7484, lng: -73.9967, city: "New York", state: "NY" },
  "10003": { lat: 40.7317, lng: -73.9893, city: "New York", state: "NY" },
  "10016": { lat: 40.7459, lng: -73.978, city: "New York", state: "NY" },
  "10019": { lat: 40.7654, lng: -73.9854, city: "New York", state: "NY" },
  "10023": { lat: 40.7768, lng: -73.9822, city: "New York", state: "NY" },
  "10036": { lat: 40.759, lng: -73.9845, city: "New York", state: "NY" },
  "10128": { lat: 40.7816, lng: -73.953, city: "New York", state: "NY" },
  "10301": { lat: 40.6433, lng: -74.0765, city: "Staten Island", state: "NY" },
  "10451": { lat: 40.8198, lng: -73.9236, city: "Bronx", state: "NY" },
  "10701": { lat: 40.9312, lng: -73.8987, city: "Yonkers", state: "NY" },
  "11101": {
    lat: 40.7433,
    lng: -73.923,
    city: "Long Island City",
    state: "NY",
  },
  "11201": { lat: 40.6941, lng: -73.9905, city: "Brooklyn", state: "NY" },
  "11375": { lat: 40.7209, lng: -73.8448, city: "Forest Hills", state: "NY" },
  "11530": { lat: 40.7262, lng: -73.6412, city: "Garden City", state: "NY" },
  "11801": { lat: 40.7554, lng: -73.4217, city: "Hicksville", state: "NY" },
  "12207": { lat: 42.6526, lng: -73.7562, city: "Albany", state: "NY" },
  "13202": { lat: 43.0481, lng: -76.1474, city: "Syracuse", state: "NY" },
  "14202": { lat: 42.8864, lng: -78.8784, city: "Buffalo", state: "NY" },
  "14604": { lat: 43.1566, lng: -77.6088, city: "Rochester", state: "NY" },
  // North Carolina
  "27101": { lat: 36.0999, lng: -80.2442, city: "Winston-Salem", state: "NC" },
  "27401": { lat: 36.0726, lng: -79.792, city: "Greensboro", state: "NC" },
  "27502": { lat: 35.5936, lng: -78.7937, city: "Apex", state: "NC" },
  "27513": { lat: 35.7881, lng: -78.7811, city: "Cary", state: "NC" },
  "27601": { lat: 35.7796, lng: -78.6382, city: "Raleigh", state: "NC" },
  "27701": { lat: 35.994, lng: -78.8986, city: "Durham", state: "NC" },
  "28202": { lat: 35.2271, lng: -80.8431, city: "Charlotte", state: "NC" },
  "28205": { lat: 35.2225, lng: -80.8015, city: "Charlotte", state: "NC" },
  "28210": { lat: 35.1534, lng: -80.8673, city: "Charlotte", state: "NC" },
  "28403": { lat: 34.2257, lng: -77.8831, city: "Wilmington", state: "NC" },
  "28801": { lat: 35.5951, lng: -82.5515, city: "Asheville", state: "NC" },
  // North Dakota
  "58102": { lat: 46.8772, lng: -96.7898, city: "Fargo", state: "ND" },
  "58501": { lat: 46.8083, lng: -100.7837, city: "Bismarck", state: "ND" },
  // Ohio
  "43201": { lat: 39.9828, lng: -82.9984, city: "Columbus", state: "OH" },
  "43202": { lat: 40.0022, lng: -82.9827, city: "Columbus", state: "OH" },
  "43215": { lat: 39.9612, lng: -83.0007, city: "Columbus", state: "OH" },
  "43604": { lat: 41.6528, lng: -83.5379, city: "Toledo", state: "OH" },
  "44101": { lat: 41.4993, lng: -81.6944, city: "Cleveland", state: "OH" },
  "44106": { lat: 41.5089, lng: -81.6037, city: "Cleveland", state: "OH" },
  "44308": { lat: 41.0814, lng: -81.519, city: "Akron", state: "OH" },
  "45202": { lat: 39.1031, lng: -84.512, city: "Cincinnati", state: "OH" },
  "45402": { lat: 39.7589, lng: -84.1916, city: "Dayton", state: "OH" },
  // Oklahoma
  "73071": { lat: 35.2226, lng: -97.4395, city: "Norman", state: "OK" },
  "73102": { lat: 35.4676, lng: -97.5164, city: "Oklahoma City", state: "OK" },
  "74101": { lat: 36.154, lng: -95.9928, city: "Tulsa", state: "OK" },
  // Oregon
  "97201": { lat: 45.5051, lng: -122.675, city: "Portland", state: "OR" },
  "97301": { lat: 44.9429, lng: -123.0351, city: "Salem", state: "OR" },
  "97401": { lat: 44.0521, lng: -123.0868, city: "Eugene", state: "OR" },
  "97701": { lat: 44.0582, lng: -121.3153, city: "Bend", state: "OR" },
  // Pennsylvania
  "15201": { lat: 40.4768, lng: -79.9539, city: "Pittsburgh", state: "PA" },
  "15213": { lat: 40.4444, lng: -79.9533, city: "Pittsburgh", state: "PA" },
  "15232": { lat: 40.4515, lng: -79.9331, city: "Pittsburgh", state: "PA" },
  "16501": { lat: 42.1292, lng: -80.0851, city: "Erie", state: "PA" },
  "17101": { lat: 40.2732, lng: -76.8867, city: "Harrisburg", state: "PA" },
  "18101": { lat: 40.6084, lng: -75.4902, city: "Allentown", state: "PA" },
  "19101": { lat: 39.9526, lng: -75.1652, city: "Philadelphia", state: "PA" },
  "19103": { lat: 39.9524, lng: -75.1746, city: "Philadelphia", state: "PA" },
  "19106": { lat: 39.9466, lng: -75.1468, city: "Philadelphia", state: "PA" },
  "19130": { lat: 39.9661, lng: -75.1738, city: "Philadelphia", state: "PA" },
  // Rhode Island
  "02840": { lat: 41.4901, lng: -71.3128, city: "Newport", state: "RI" },
  "02901": { lat: 41.824, lng: -71.4128, city: "Providence", state: "RI" },
  // South Carolina
  "29201": { lat: 34.0007, lng: -81.0348, city: "Columbia", state: "SC" },
  "29401": { lat: 32.7765, lng: -79.9311, city: "Charleston", state: "SC" },
  "29601": { lat: 34.8526, lng: -82.394, city: "Greenville", state: "SC" },
  "29801": { lat: 33.5612, lng: -81.7196, city: "Aiken", state: "SC" },
  // South Dakota
  "57101": { lat: 43.5446, lng: -96.7311, city: "Sioux Falls", state: "SD" },
  "57701": { lat: 44.0805, lng: -103.231, city: "Rapid City", state: "SD" },
  // Tennessee
  "37201": { lat: 36.1627, lng: -86.7816, city: "Nashville", state: "TN" },
  "37402": { lat: 35.0456, lng: -85.3097, city: "Chattanooga", state: "TN" },
  "37902": { lat: 35.9606, lng: -83.9207, city: "Knoxville", state: "TN" },
  "38103": { lat: 35.1495, lng: -90.049, city: "Memphis", state: "TN" },
  // Texas
  "73301": { lat: 30.2672, lng: -97.7431, city: "Austin", state: "TX" },
  "75001": { lat: 32.9535, lng: -96.8389, city: "Addison", state: "TX" },
  "75034": { lat: 33.0976, lng: -96.8222, city: "Frisco", state: "TX" },
  "75070": { lat: 33.1972, lng: -96.6153, city: "McKinney", state: "TX" },
  "75201": { lat: 32.7889, lng: -96.7985, city: "Dallas", state: "TX" },
  "75202": { lat: 32.7768, lng: -96.797, city: "Dallas", state: "TX" },
  "75204": { lat: 32.8012, lng: -96.788, city: "Dallas", state: "TX" },
  "75225": { lat: 32.8639, lng: -96.792, city: "Dallas", state: "TX" },
  "76010": { lat: 32.7357, lng: -97.1081, city: "Arlington", state: "TX" },
  "76013": { lat: 32.717, lng: -97.1589, city: "Arlington", state: "TX" },
  "76102": { lat: 32.7555, lng: -97.3308, city: "Fort Worth", state: "TX" },
  "76201": { lat: 33.2148, lng: -97.1331, city: "Denton", state: "TX" },
  "76301": { lat: 33.9137, lng: -98.4934, city: "Wichita Falls", state: "TX" },
  "77001": { lat: 29.7604, lng: -95.3698, city: "Houston", state: "TX" },
  "77002": { lat: 29.7551, lng: -95.3579, city: "Houston", state: "TX" },
  "77007": { lat: 29.7747, lng: -95.4041, city: "Houston", state: "TX" },
  "77024": { lat: 29.7715, lng: -95.5288, city: "Houston", state: "TX" },
  "77056": { lat: 29.748, lng: -95.4649, city: "Houston", state: "TX" },
  "77098": { lat: 29.7385, lng: -95.4133, city: "Houston", state: "TX" },
  "77381": { lat: 30.1741, lng: -95.4906, city: "The Woodlands", state: "TX" },
  "77459": { lat: 29.5446, lng: -95.6031, city: "Missouri City", state: "TX" },
  "77494": { lat: 29.7858, lng: -95.8135, city: "Katy", state: "TX" },
  "77584": { lat: 29.5633, lng: -95.3211, city: "Pearland", state: "TX" },
  "77901": { lat: 28.8053, lng: -97.0036, city: "Victoria", state: "TX" },
  "78201": { lat: 29.4645, lng: -98.5255, city: "San Antonio", state: "TX" },
  "78205": { lat: 29.4241, lng: -98.4936, city: "San Antonio", state: "TX" },
  "78401": { lat: 27.8006, lng: -97.3964, city: "Corpus Christi", state: "TX" },
  "78501": { lat: 26.2034, lng: -98.23, city: "McAllen", state: "TX" },
  "78613": { lat: 30.5103, lng: -97.8203, city: "Cedar Park", state: "TX" },
  "78660": { lat: 30.4507, lng: -97.6014, city: "Pflugerville", state: "TX" },
  "78664": { lat: 30.5083, lng: -97.6789, city: "Round Rock", state: "TX" },
  "78681": { lat: 30.5338, lng: -97.7303, city: "Round Rock", state: "TX" },
  "78701": { lat: 30.27, lng: -97.7403, city: "Austin", state: "TX" },
  "78704": { lat: 30.2437, lng: -97.7634, city: "Austin", state: "TX" },
  "78745": { lat: 30.2085, lng: -97.7953, city: "Austin", state: "TX" },
  "79401": { lat: 33.5779, lng: -101.8552, city: "Lubbock", state: "TX" },
  "79901": { lat: 31.7587, lng: -106.4869, city: "El Paso", state: "TX" },
  // Utah
  "84101": { lat: 40.7608, lng: -111.891, city: "Salt Lake City", state: "UT" },
  "84401": { lat: 41.223, lng: -111.9738, city: "Ogden", state: "UT" },
  "84601": { lat: 40.2338, lng: -111.6585, city: "Provo", state: "UT" },
  "84721": { lat: 37.6775, lng: -113.0619, city: "Cedar City", state: "UT" },
  // Vermont
  "05401": { lat: 44.4759, lng: -73.2121, city: "Burlington", state: "VT" },
  "05602": { lat: 44.2601, lng: -72.5754, city: "Montpelier", state: "VT" },
  // Virginia
  "22030": { lat: 38.8462, lng: -77.3064, city: "Fairfax", state: "VA" },
  "22101": { lat: 38.9395, lng: -77.1764, city: "McLean", state: "VA" },
  "22201": { lat: 38.8816, lng: -77.091, city: "Arlington", state: "VA" },
  "22301": { lat: 38.8048, lng: -77.0469, city: "Alexandria", state: "VA" },
  "22314": { lat: 38.8101, lng: -77.0649, city: "Alexandria", state: "VA" },
  "23219": { lat: 37.5407, lng: -77.436, city: "Richmond", state: "VA" },
  "23451": { lat: 36.8529, lng: -75.978, city: "Virginia Beach", state: "VA" },
  "23601": { lat: 37.0299, lng: -76.458, city: "Newport News", state: "VA" },
  "24011": { lat: 37.271, lng: -79.9414, city: "Roanoke", state: "VA" },
  // Washington
  "98004": { lat: 47.6168, lng: -122.2076, city: "Bellevue", state: "WA" },
  "98052": { lat: 47.674, lng: -122.1215, city: "Redmond", state: "WA" },
  "98101": { lat: 47.6062, lng: -122.3321, city: "Seattle", state: "WA" },
  "98103": { lat: 47.6718, lng: -122.3426, city: "Seattle", state: "WA" },
  "98105": { lat: 47.6615, lng: -122.2757, city: "Seattle", state: "WA" },
  "98115": { lat: 47.6873, lng: -122.2903, city: "Seattle", state: "WA" },
  "98402": { lat: 47.2529, lng: -122.4443, city: "Tacoma", state: "WA" },
  "98502": { lat: 47.0379, lng: -122.9007, city: "Olympia", state: "WA" },
  "98801": { lat: 47.4235, lng: -120.3103, city: "Wenatchee", state: "WA" },
  "99201": { lat: 47.6588, lng: -117.426, city: "Spokane", state: "WA" },
  // West Virginia
  "25301": { lat: 38.3498, lng: -81.6326, city: "Charleston", state: "WV" },
  "25401": { lat: 39.4562, lng: -77.9639, city: "Martinsburg", state: "WV" },
  "26003": { lat: 40.064, lng: -80.7209, city: "Wheeling", state: "WV" },
  // Wisconsin
  "53202": { lat: 43.0389, lng: -87.9065, city: "Milwaukee", state: "WI" },
  "53703": { lat: 43.0731, lng: -89.4012, city: "Madison", state: "WI" },
  "54301": { lat: 44.5133, lng: -88.0158, city: "Green Bay", state: "WI" },
  "54601": { lat: 43.8014, lng: -91.2396, city: "La Crosse", state: "WI" },
  // Wyoming
  "82001": { lat: 41.14, lng: -104.8202, city: "Cheyenne", state: "WY" },
  "82601": { lat: 42.8666, lng: -106.3131, city: "Casper", state: "WY" },
  "83001": { lat: 43.4799, lng: -110.7624, city: "Jackson", state: "WY" },
};

// ─── Core Functions ─────────────────────────────────────────────────────────────

/**
 * Look up latitude/longitude and location info for a US zip code.
 *
 * Checks Firestore `zip_coordinates/{zip}` cache first, then falls back
 * to the built-in lookup table of major US metro zip codes.
 *
 * @param zip - 5-digit US zip code string
 * @returns Coordinate and location data, or null if not found
 */
export async function getZipCoordinates(
  zip: string,
): Promise<ZipCoordinates | null> {
  if (!zip || !/^\d{5}$/.test(zip)) {
    return null;
  }

  // 1. Check Firestore cache first
  try {
    const cached = await db.collection("zip_coordinates").doc(zip).get();
    if (cached.exists) {
      const data = cached.data()!;
      if (
        typeof data.lat === "number" &&
        typeof data.lng === "number" &&
        typeof data.city === "string" &&
        typeof data.state === "string"
      ) {
        return {
          lat: data.lat,
          lng: data.lng,
          city: data.city,
          state: data.state,
        };
      }
    }
  } catch (err) {
    // Firestore read failed — fall through to inline table
    functions.logger.warn(`Firestore zip lookup failed for ${zip}:`, err);
  }

  // 2. Fall back to inline lookup table
  const entry = ZIP_TABLE[zip];
  if (entry) {
    return { ...entry };
  }

  return null;
}

/**
 * Calculate the great-circle distance between two points using the haversine formula.
 *
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lng1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lng2 - Longitude of point 2 (degrees)
 * @returns Distance in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Find workers near a project location who offer a given service.
 *
 * Workflow:
 *   1. Look up project zip coordinates
 *   2. Query workers filtered by `skills` array-contains and availability
 *   3. Filter out suspended workers (check `suspended_until` timestamp)
 *   4. Calculate haversine distance using worker lat/lng or zip_code lookup
 *   5. Respect both the search radius and the worker's own service_radius_miles
 *   6. Return sorted by distance (closest first)
 *
 * @param projectZip - 5-digit zip code of the project location
 * @param serviceType - Service type to match (e.g. "site_survey", "roof_installation")
 * @param radiusMiles - Maximum distance in miles (default 50)
 * @returns Array of matched workers sorted by distance, or empty array
 */
export async function findWorkersInRange(
  projectZip: string,
  serviceType: string,
  radiusMiles: number = DEFAULT_RADIUS_MILES,
): Promise<WorkerMatch[]> {
  // Resolve project coordinates
  const projectCoords = await getZipCoordinates(projectZip);
  if (!projectCoords) {
    functions.logger.warn(`Cannot resolve coordinates for project zip: ${projectZip}`);
    return [];
  }

  // Query workers who have the required skill and are not unavailable.
  // Firestore array-contains lets us filter by skill server-side.
  const snapshot = await db
    .collection("workers")
    .where("skills", "array-contains", serviceType)
    .where("availability", "in", ["available", "busy"])
    .get();

  if (snapshot.empty) {
    return [];
  }

  const now = admin.firestore.Timestamp.now();
  const matches: WorkerMatch[] = [];

  for (const doc of snapshot.docs) {
    const worker = doc.data();

    // Skip suspended workers
    if (worker.suspended_until) {
      const suspendedUntil =
        worker.suspended_until as admin.firestore.Timestamp;
      if (suspendedUntil.toMillis() > now.toMillis()) {
        continue;
      }
    }

    // Determine worker coordinates — prefer stored lat/lng, then look up zip
    let workerLat: number | undefined;
    let workerLng: number | undefined;

    if (typeof worker.lat === "number" && typeof worker.lng === "number") {
      workerLat = worker.lat;
      workerLng = worker.lng;
    } else if (worker.zip_code && typeof worker.zip_code === "string") {
      const workerCoords = await getZipCoordinates(worker.zip_code);
      if (workerCoords) {
        workerLat = workerCoords.lat;
        workerLng = workerCoords.lng;
      }
    }

    // If we still don't have coordinates, check state-level service_areas
    if (workerLat === undefined || workerLng === undefined) {
      if (
        Array.isArray(worker.service_areas) &&
        worker.service_areas.includes(projectCoords.state)
      ) {
        // Include with a penalty distance so they rank below geo-located workers
        matches.push({
          workerId: doc.id,
          distance: radiusMiles * 0.99,
          worker: { id: doc.id, ...worker },
        });
      }
      continue;
    }

    // Calculate haversine distance
    const distance = haversineDistance(
      projectCoords.lat,
      projectCoords.lng,
      workerLat,
      workerLng,
    );

    // Respect the worker's own service radius if set
    const workerRadius =
      typeof worker.service_radius_miles === "number"
        ? worker.service_radius_miles
        : DEFAULT_RADIUS_MILES;

    if (distance <= radiusMiles && distance <= workerRadius) {
      matches.push({
        workerId: doc.id,
        distance: Math.round(distance * 100) / 100,
        worker: { id: doc.id, ...worker },
      });
    }
  }

  // Sort by distance ascending (closest first)
  matches.sort((a, b) => a.distance - b.distance);

  return matches;
}

/**
 * Seed the Firestore `zip_coordinates` collection from the inline lookup table.
 *
 * Callable Cloud Function that writes all entries from ZIP_TABLE into Firestore
 * for faster lookups and to allow additional zips to be added via the database.
 * Uses batched writes for efficiency.
 *
 * Requires admin authentication.
 */
export const seedZipCoordinates = functions.https.onCall(
  async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in",
      );
    }

    // Check admin role
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    const entries = Object.entries(ZIP_TABLE);
    let written = 0;

    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 499;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = entries.slice(i, i + BATCH_SIZE);

      for (const [zip, coords] of chunk) {
        const ref = db.collection("zip_coordinates").doc(zip);
        batch.set(
          ref,
          {
            lat: coords.lat,
            lng: coords.lng,
            city: coords.city,
            state: coords.state,
            source: "inline_seed",
            seeded_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();
      written += chunk.length;
    }

    return {
      success: true,
      zips_seeded: written,
      total_in_table: entries.length,
    };
  },
);
