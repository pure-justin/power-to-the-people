// Address Service - Google Places parsing and geolocation

/**
 * Parse Google Places/Geocoding address components
 */
export function parseGoogleAddress(place) {
  // Handle lat/lng - can be a function (LatLng object) or a plain number
  const location = place.geometry?.location;
  let lat = null;
  let lng = null;

  if (location) {
    lat = typeof location.lat === "function" ? location.lat() : location.lat;
    lng = typeof location.lng === "function" ? location.lng() : location.lng;
  }

  const result = {
    formattedAddress: place.formatted_address || "",
    streetNumber: "",
    street: "",
    city: "",
    county: "",
    state: "",
    zipCode: "",
    country: "",
    lat,
    lng,
  };

  const components = place.address_components || [];

  // Debug: log all address components
  console.log(
    "Google Address Components:",
    components.map((c) => ({ types: c.types, long_name: c.long_name })),
  );

  for (const component of components) {
    const types = component.types;

    if (types.includes("street_number")) {
      result.streetNumber = component.long_name;
    }
    if (types.includes("route")) {
      result.street = component.long_name;
    }
    if (types.includes("locality")) {
      result.city = component.long_name;
    }
    if (types.includes("administrative_area_level_2")) {
      // County - Google returns "Harris County" so we strip " County" suffix
      result.county = component.long_name.replace(/ County$/i, "");
    }
    if (types.includes("administrative_area_level_1")) {
      result.state = component.short_name;
    }
    if (types.includes("postal_code")) {
      result.zipCode = component.long_name;
    }
    if (types.includes("country")) {
      result.country = component.short_name;
    }
  }

  // Combine street address
  result.streetAddress = [result.streetNumber, result.street]
    .filter(Boolean)
    .join(" ");

  return result;
}

/**
 * Reverse geocode coordinates to address
 */
async function reverseGeocode(lat, lng) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Location service requires Google Maps API key.");
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
  );

  const data = await response.json();

  if (data.status !== "OK" || !data.results[0]) {
    const errorMessages = {
      REQUEST_DENIED:
        "Geocoding API not enabled. Please enable it in Google Cloud Console.",
      OVER_QUERY_LIMIT: "API quota exceeded. Please try again later.",
      INVALID_REQUEST: "Invalid location coordinates.",
      ZERO_RESULTS: "No address found for this location.",
      UNKNOWN_ERROR: "Server error. Please try again.",
    };
    const message =
      errorMessages[data.status] || `Geocoding failed: ${data.status}`;
    console.error(
      "Google Geocoding Error:",
      data.status,
      data.error_message || "",
    );
    throw new Error(message);
  }

  return parseGoogleAddress(data.results[0]);
}

/**
 * Get current location and reverse geocode
 */
export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await reverseGeocode(latitude, longitude);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        let message = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission denied. Please enable location access or enter your address manually.";
            break;
          case error.POSITION_UNAVAILABLE:
            message =
              "Location unavailable. Please enter your address manually.";
            break;
          case error.TIMEOUT:
            message =
              "Location request timed out. Please try again or enter your address manually.";
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    );
  });
}

export default {
  parseGoogleAddress,
  getCurrentLocation,
};
