import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  StandaloneSearchBox,
} from "@react-google-maps/api";
import { FiNavigation, FiLoader, FiSearch, FiMapPin } from "react-icons/fi";
import { addToast } from "@heroui/react";

/* ---------------- Types ---------------- */
type Location = {
  lat: number;
  lng: number;
};

type AddressDetails = {
  address: string;
  city: string;
  state: string;
  pincode: string;
};

type InteractiveMapProps = {
  initialLocation?: Location | null;
  initialAddress?: AddressDetails | null;
  onLocationChange: (location: Location, address: AddressDetails) => void;
  locationIqApiKey?: string; // kept for backward compatibility
  /** Override the map canvas height. Defaults to "380px". */
  height?: string;
};

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = [
  "places",
];



const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  backgroundColor: "#f4f7f5",
  styles: [
    {
      elementType: "geometry",
      stylers: [{ color: "#eef4f2" }],
    },
    {
      elementType: "labels.text.fill",
      stylers: [{ color: "#718096" }],
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "administrative",
      elementType: "geometry.stroke",
      stylers: [{ color: "#d8e2e6" }],
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#f4f7f5" }],
    },
    {
      featureType: "landscape.man_made",
      elementType: "geometry",
      stylers: [{ color: "#edf2f4" }],
    },
    {
      featureType: "landscape.natural",
      elementType: "geometry",
      stylers: [{ color: "#eef5f0" }],
    },
    {
      featureType: "poi.business",
      elementType: "labels",
      stylers: [{ visibility: "on" }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#e6f1e9" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#dcefe2" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#dce4ea" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#fbfbf8" }],
    },
    {
      featureType: "road.arterial",
      elementType: "geometry",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "road.local",
      elementType: "geometry",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#e8eef2" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#d9edf2" }],
    },
  ],
};

/* ---------------- Helper: reverse geocode with Google ---------------- */
const reverseGeocodeGoogle = async (
  lat: number,
  lng: number
): Promise<AddressDetails> => {
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results || results.length === 0) {
        reject(new Error("Geocoder failed: " + status));
        return;
      }

      const result = results[0];
      let city = "";
      let state = "";
      let pincode = "";

      for (const comp of result.address_components) {
        if (comp.types.includes("locality")) city = comp.long_name;
        else if (comp.types.includes("administrative_area_level_3") && !city)
          city = comp.long_name;
        else if (comp.types.includes("administrative_area_level_2") && !city)
          city = comp.long_name;
        if (comp.types.includes("administrative_area_level_1"))
          state = comp.long_name;
        if (comp.types.includes("postal_code")) pincode = comp.long_name;
      }

      resolve({
        address: result.formatted_address,
        city,
        state,
        pincode,
      });
    });
  });
};

/* ---------------- Extract address from Place result ---------------- */
const extractAddressFromPlace = (
  place: google.maps.places.PlaceResult
): AddressDetails => {
  let city = "";
  let state = "";
  let pincode = "";

  if (place.address_components) {
    for (const comp of place.address_components) {
      if (comp.types.includes("locality")) city = comp.long_name;
      else if (
        comp.types.includes("administrative_area_level_3") &&
        !city
      )
        city = comp.long_name;
      else if (
        comp.types.includes("administrative_area_level_2") &&
        !city
      )
        city = comp.long_name;
      if (comp.types.includes("administrative_area_level_1"))
        state = comp.long_name;
      if (comp.types.includes("postal_code")) pincode = comp.long_name;
    }
  }

  return {
    address: place.formatted_address || place.name || "",
    city,
    state,
    pincode,
  };
};

/* ================================================================
   Main Component
   ================================================================ */
const InteractiveMap: React.FC<InteractiveMapProps> = ({
  initialLocation,
  onLocationChange,
  height = "380px",
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [markerPosition, setMarkerPosition] = useState<Location>(
    initialLocation || defaultCenter
  );
  const [mapCenter, setMapCenter] = useState<Location>(
    initialLocation || defaultCenter
  );
  const [zoom, setZoom] = useState(initialLocation ? 15 : 5);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const initialLat = initialLocation?.lat;
  const initialLng = initialLocation?.lng;

  /* Move marker + reverse geocode on click */
  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      setIsGeocoding(true);
      try {
        const addr = await reverseGeocodeGoogle(lat, lng);
        // setAddressDisplay(addr.address);
        onLocationChange({ lat, lng }, addr);
      } catch {
        addToast({
          title: "Geocoding error",
          description: "Could not fetch address for this location.",
          color: "danger",
        });
      } finally {
        setIsGeocoding(false);
      }
    },
    [onLocationChange]
  );

  /* Drag-end on marker */
  const handleMarkerDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      setIsGeocoding(true);
      try {
        const addr = await reverseGeocodeGoogle(lat, lng);
        // setAddressDisplay(addr.address);
        onLocationChange({ lat, lng }, addr);
      } catch {
        addToast({
          title: "Geocoding error",
          description: "Could not fetch address for this location.",
          color: "danger",
        });
      } finally {
        setIsGeocoding(false);
      }
    },
    [onLocationChange]
  );

  /* SearchBox places changed */
  const handlePlacesChanged = useCallback(() => {
    if (!searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    if (!places || places.length === 0) return;

    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const addr = extractAddressFromPlace(place);
    setMarkerPosition({ lat, lng });
    setMapCenter({ lat, lng });
    setZoom(16);
    // setAddressDisplay(addr.address);
    onLocationChange({ lat, lng }, addr);
  }, [onLocationChange]);

  /* Use current GPS location */
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      addToast({
        title: "Not supported",
        description: "Geolocation is not supported by your browser.",
        color: "danger",
      });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarkerPosition({ lat, lng });
        setMapCenter({ lat, lng });
        setZoom(16);
        setIsGeocoding(true);
        try {
          const addr = await reverseGeocodeGoogle(lat, lng);
          // setAddressDisplay(addr.address);
          onLocationChange({ lat, lng }, addr);
        } catch {
          addToast({
            title: "Error",
            description: "Could not convert your location to address.",
            color: "danger",
          });
        } finally {
          setIsGeocoding(false);
          setIsGettingLocation(false);
        }
      },
      (err) => {
        setIsGettingLocation(false);
        let msg = "Failed to get your location.";
        if (err.code === err.PERMISSION_DENIED)
          msg = "Location permission denied. Please allow it in your browser.";
        addToast({ title: "Location error", description: msg, color: "danger" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onLocationChange]);

  /* Sync initial values */
  useEffect(() => {
    if (typeof initialLat === "number" && typeof initialLng === "number") {
      const nextLocation = { lat: initialLat, lng: initialLng };
      setMarkerPosition(nextLocation);
      setMapCenter(nextLocation);
      setZoom(15);
    }
  }, [initialLat, initialLng]);

  const handleZoomChange = useCallback((delta: number) => {
    const currentZoom = mapRef.current?.getZoom() ?? zoom;
    const nextZoom = Math.min(20, Math.max(3, currentZoom + delta));

    setZoom(nextZoom);
    mapRef.current?.setZoom(nextZoom);
  }, [zoom]);

  /* ---- Render States ---- */
  if (loadError) {
    return (
      <div className="w-full h-full min-h-[120px] bg-red-50 border border-red-200 flex items-center justify-center" style={{ height }}>
        <div className="text-center text-red-600 text-sm px-4">
          <FiMapPin className="mx-auto mb-2 h-6 w-6" />
          <p className="font-semibold">Failed to load Google Maps</p>
          <p className="text-xs mt-1 text-red-400">
            Check your API key and ensure billing is enabled.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[120px] bg-slate-50 border border-slate-200 flex items-center justify-center" style={{ height }}>
        <div className="text-center text-slate-500">
          <FiLoader className="mx-auto mb-2 h-6 w-6 animate-spin text-teal-500" />
          <p className="text-sm">Loading map…</p>
        </div>
      </div>
    );
  }

  const markerIcon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="shadow" x="4" y="2" width="36" height="40" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0F172A" flood-opacity="0.18"/>
        </filter>
        <path filter="url(#shadow)" d="M22 5C14.8 5 9 10.8 9 18c0 9.8 13 21 13 21s13-11.2 13-21C35 10.8 29.2 5 22 5Z" fill="#DC3E57"/>
        <circle cx="22" cy="18" r="4.5" fill="white"/>
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(44, 44),
    anchor: new google.maps.Point(22, 40),
  };

  return (
    <div className="clinic-location-map flex h-full w-full flex-col bg-white font-outfit dark:bg-slate-800">
      {/* ── Search bar + My Location button ── */}
      <div className="flex gap-2 bg-white px-3 py-2 dark:bg-slate-800">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <StandaloneSearchBox
            onLoad={(ref) => (searchBoxRef.current = ref)}
            onPlacesChanged={handlePlacesChanged}
            options={{
              bounds: new google.maps.LatLngBounds(
                new google.maps.LatLng(8.4, 68.7),
                new google.maps.LatLng(37.6, 97.25)
              ),
            }}
          >
            <input
              type="text"
              placeholder="Search colony, area or landmark"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-[12px] font-medium text-slate-700 transition-all placeholder:text-slate-500 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </StandaloneSearchBox>
        </div>

        {/* My Location button — prominent, clearly clickable */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGettingLocation || isGeocoding}
          title="Use my current location"
          className={[
            "flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition-all whitespace-nowrap select-none sm:px-3",
            isGettingLocation
              ? "bg-teal-50 border border-teal-300 text-teal-600 cursor-wait"
              : "bg-[#0A6C74] text-white hover:bg-[#085f67] active:scale-95 shadow-sm",
            (isGeocoding && !isGettingLocation) ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          {isGettingLocation ? (
            <>
              <FiLoader className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>Locating…</span>
            </>
          ) : (
            <>
              <FiNavigation className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Use My Location</span>
              <span className="sm:hidden">Locate</span>
            </>
          )}
        </button>
      </div>

      {/* ── Map canvas ── */}
      <div className="relative flex-1 min-h-0">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={mapCenter}
          zoom={zoom}
          options={mapOptions}
          onClick={handleMapClick}
          onLoad={(map) => { mapRef.current = map; }}
        >
          <Marker
            position={markerPosition}
            icon={markerIcon}
            draggable
            onDragEnd={handleMarkerDragEnd}
            animation={google.maps.Animation.DROP}
          />
        </GoogleMap>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGettingLocation || isGeocoding}
          aria-label="Use my current location"
          className="absolute bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-danger shadow-md transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
        >
          {isGettingLocation ? (
            <FiLoader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FiNavigation className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => handleZoomChange(1)}
            className="flex h-7 w-7 items-center justify-center text-[20px] font-medium leading-none text-slate-700 transition-colors hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="h-px bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={() => handleZoomChange(-1)}
            className="flex h-7 w-7 items-center justify-center text-[22px] font-medium leading-none text-slate-700 transition-colors hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800"
            aria-label="Zoom out"
          >
            -
          </button>
        </div>

        {/* Geocoding overlay */}
        {isGeocoding && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-md text-[12px] text-teal-700 font-semibold border border-teal-100">
              <FiLoader className="animate-spin h-3.5 w-3.5" />
              Fetching address…
            </div>
          </div>
        )}

        {/* My Location pulse — shows briefly while getting GPS */}
        {isGettingLocation && (
          <div className="absolute inset-0 bg-teal-500/5 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-lg border border-teal-200">
              <div className="relative flex h-10 w-10 items-center justify-center">
                <span className="absolute h-10 w-10 rounded-full bg-teal-400/30 animate-ping" />
                <span className="absolute h-6 w-6 rounded-full bg-teal-400/50 animate-ping animation-delay-150" />
                <FiNavigation className="relative h-5 w-5 text-[#0A6C74]" />
              </div>
              <p className="text-[12px] font-semibold text-[#0A6C74]">Getting your location…</p>
              <p className="text-[10px] text-[#64748B]">Please allow location access if prompted</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .clinic-location-map .gm-style {
          font-family: Outfit, sans-serif !important;
          background: #f4f7f5 !important;
        }

        .clinic-location-map .gm-style > div:first-child {
          background: #f4f7f5 !important;
        }

        .clinic-location-map .gm-style canvas,
        .clinic-location-map .gm-style img:not([src^="data:image/svg+xml"]) {
          filter: brightness(1.34) saturate(0.42) contrast(0.84) !important;
        }

        .clinic-location-map .gm-bundled-control img,
        .clinic-location-map .gm-control-active img,
        .clinic-location-map .gm-style-cc img,
        .clinic-location-map a[href^="https://maps.google.com/maps"] img {
          filter: none !important;
        }

        .clinic-location-map .gm-bundled-control {
          margin: 8px !important;
        }

        .clinic-location-map .gm-bundled-control > div {
          border-radius: 10px !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12) !important;
        }

        .clinic-location-map .gm-control-active {
          height: 30px !important;
          width: 30px !important;
        }

        .clinic-location-map .gm-control-active img {
          height: 12px !important;
          width: 12px !important;
        }

        .clinic-location-map .gm-bundled-control div[style*="height: 40px"] {
          height: 30px !important;
        }

        .clinic-location-map .gm-bundled-control div[style*="width: 40px"] {
          width: 30px !important;
        }
      `}</style>
        
    </div>
  );
};

export default InteractiveMap;
