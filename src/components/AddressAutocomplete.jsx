import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Navigation, Loader2, X, Search } from "lucide-react";
import {
  parseGoogleAddress,
  getCurrentLocation,
} from "../services/addressService";
import useGoogleMaps from "../hooks/useGoogleMaps";
import "./AddressAutocomplete.css";

function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Enter your home address",
}) {
  const { isLoaded: mapsLoaded, error: mapsError } = useGoogleMaps();
  const [inputValue, setInputValue] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize Google Places Autocomplete when maps are loaded
  useEffect(() => {
    if (!mapsLoaded || !inputRef.current) {
      return;
    }

    if (mapsError) {
      setFallbackMode(true);
      return;
    }

    try {
      // Continental US bounding box
      const usBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(24.396, -125.0), // SW corner
        new window.google.maps.LatLng(49.384, -66.934), // NE corner
      );

      const options = {
        componentRestrictions: { country: "us" },
        fields: [
          "address_components",
          "formatted_address",
          "geometry",
          "place_id",
        ],
        types: ["address"],
        bounds: usBounds,
        strictBounds: false,
      };

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options,
      );

      autocompleteRef.current.addListener("place_changed", handlePlaceSelect);
    } catch (err) {
      console.warn("Failed to initialize autocomplete:", err);
      setFallbackMode(true);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(
          autocompleteRef.current,
        );
      }
    };
  }, [mapsLoaded, mapsError]);

  const handlePlaceSelect = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (!place.geometry) {
      setError("Please select an address from the suggestions");
      return;
    }

    const addressData = parseGoogleAddress(place);
    processAddress(addressData);
  }, []);

  const processAddress = (addressData) => {
    setSelectedAddress(addressData);
    setInputValue(addressData.formattedAddress);
    setError(null);

    // Notify parent of address selection
    if (onAddressSelect) {
      onAddressSelect(addressData);
    }
  };

  const handleCurrentLocation = async () => {
    setIsLocating(true);
    setError(null);

    try {
      const addressData = await getCurrentLocation();
      processAddress(addressData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLocating(false);
    }
  };

  // Fallback: manual entry without autocomplete
  const handleManualSubmit = () => {
    if (!inputValue.trim()) {
      setError("Please enter an address");
      return;
    }

    // Try to parse basic address format
    const addressData = {
      formattedAddress: inputValue,
      streetAddress: inputValue,
      city: "",
      state: "",
      zipCode: "",
    };

    // Extract zip code if present
    const zipMatch = inputValue.match(/\b\d{5}(-\d{4})?\b/);
    if (zipMatch) {
      addressData.zipCode = zipMatch[0].substring(0, 5);
    }

    processAddress(addressData);
  };

  const handleClear = () => {
    setInputValue("");
    setSelectedAddress(null);
    setError(null);

    if (inputRef.current) {
      inputRef.current.focus();
    }

    if (onAddressSelect) {
      onAddressSelect(null);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setSelectedAddress(null);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (fallbackMode) {
        handleManualSubmit();
        return;
      }

      // If no value or already selected, do nothing
      if (!inputValue.trim() || selectedAddress) {
        return;
      }

      // Use AutocompleteService to get the first prediction
      const autocompleteService =
        new window.google.maps.places.AutocompleteService();
      const placesService = new window.google.maps.places.PlacesService(
        document.createElement("div"),
      );

      autocompleteService.getPlacePredictions(
        {
          input: inputValue,
          componentRestrictions: { country: "us" },
          types: ["address"],
        },
        (predictions, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            predictions?.length > 0
          ) {
            // Get details for the first prediction
            placesService.getDetails(
              {
                placeId: predictions[0].place_id,
                fields: [
                  "address_components",
                  "formatted_address",
                  "geometry",
                  "place_id",
                ],
              },
              (place, detailStatus) => {
                if (
                  detailStatus ===
                    window.google.maps.places.PlacesServiceStatus.OK &&
                  place
                ) {
                  const addressData = parseGoogleAddress(place);
                  processAddress(addressData);
                }
              },
            );
          }
        },
      );
    }
  };

  return (
    <div className="address-autocomplete">
      <div className="address-input-wrapper">
        <div className="address-input-container">
          <MapPin className="input-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`address-input ${selectedAddress ? "has-value" : ""} ${error ? "has-error" : ""}`}
            autoComplete="off"
          />
          {inputValue && (
            <button
              type="button"
              className="clear-btn"
              onClick={handleClear}
              aria-label="Clear address"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="address-actions">
          {fallbackMode && inputValue && (
            <button
              type="button"
              className="check-btn"
              onClick={handleManualSubmit}
              title="Use this address"
            >
              <Search size={20} />
              <span className="btn-text">Use</span>
            </button>
          )}

          <button
            type="button"
            className="location-btn"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            title="Use my current location"
          >
            {isLocating ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <Navigation size={20} />
            )}
            <span className="location-text">Current Location</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="address-error">
          <span>{error}</span>
        </div>
      )}

      {selectedAddress && (
        <div className="address-selected">
          <span className="selected-label">Selected:</span>
          <span className="selected-address">
            {selectedAddress.formattedAddress}
          </span>
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
