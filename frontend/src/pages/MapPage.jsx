import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import MapLibreMap from "../components/MapLibreMap.jsx";
import { ensureCurrentUser } from "../userSession.js";

const LOCATION_UPLOAD_INTERVAL_MS = 5000;
const LOCATION_HEARTBEAT_MS = 15000;
const FRIEND_POLL_INTERVAL_MS = 3000;

function geolocationMessage(error) {
  if (!window.isSecureContext) {
    return "Геолокація працює лише через HTTPS або localhost.";
  }

  if (error?.code === 1) {
    return "Доступ до геолокації заборонено. Дозвольте доступ до місцезнаходження для цього сайту в налаштуваннях браузера.";
  }

  if (error?.code === 2) {
    return "Не вдалося визначити позицію. Перевірте, чи увімкнена геолокація на телефоні.";
  }

  if (error?.code === 3) {
    return "Визначення позиції зайняло надто багато часу. Спробуйте ще раз.";
  }

  return "Не вдалося отримати геолокацію.";
}

function positionToLocation(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    updated_at: new Date().toISOString(),
  };
}

export default function MapPage() {
  const [user, setUser] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [friendLocations, setFriendLocations] = useState([]);
  const [eventPins, setEventPins] = useState([]);
  const [locationError, setLocationError] = useState("");

  const lastUploadAtRef = useRef(0);
  const watchIdRef = useRef(null);
  const latestLocationRef = useRef(null);

  useEffect(() => {
    let active = true;

    ensureCurrentUser()
      .then(async (profile) => {
        if (!active) return;
        setUser(profile);

        try {
          const events = await api.getUserActivities(profile.id);
          if (active) setEventPins(events);
        } catch (error) {
          if (active) setLocationError(error.message);
        }
      })
      .catch((error) => {
        if (active) setLocationError(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const uploadLocation = useCallback(
    async (location, force = false) => {
      if (!user?.location_sharing_enabled || !location) return;

      const now = Date.now();
      if (!force && now - lastUploadAtRef.current < LOCATION_UPLOAD_INTERVAL_MS) {
        return;
      }

      lastUploadAtRef.current = now;

      try {
        await api.updateLocation(user.id, {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        });
      } catch (error) {
        setLocationError(error.message);
      }
    },
    [user]
  );

  const handleLocationFound = useCallback(
    (location, forceUpload = false) => {
      latestLocationRef.current = location;
      setCurrentLocation(location);
      setLocationError("");
      uploadLocation(location, forceUpload);
    },
    [uploadLocation]
  );

  // Android-first foreground location tracking.
  // Opening the map automatically starts the browser permission flow and a
  // continuous watchPosition subscription when location sharing is enabled.
  useEffect(() => {
    if (!user?.location_sharing_enabled) return undefined;

    if (!window.isSecureContext) {
      setLocationError("Геолокація працює лише через HTTPS або localhost.");
      return undefined;
    }

    if (!navigator.geolocation) {
      setLocationError("Цей браузер не підтримує Geolocation API.");
      return undefined;
    }

    let disposed = false;

    const onPosition = (position, forceUpload = false) => {
      if (disposed) return;
      handleLocationFound(positionToLocation(position), forceUpload);
    };

    const onError = (error) => {
      if (!disposed) setLocationError(geolocationMessage(error));
    };

    const clearWatch = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };

    const requestFreshPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => onPosition(position, true),
        onError,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20000,
        }
      );
    };

    const startWatch = () => {
      if (watchIdRef.current !== null) return;

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => onPosition(position, false),
        onError,
        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 30000,
        }
      );
    };

    const restartTracking = () => {
      if (document.visibilityState !== "visible") return;
      clearWatch();
      requestFreshPosition();
      startWatch();
    };

    // Request a fresh location immediately, then keep watching changes.
    requestFreshPosition();
    startWatch();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        restartTracking();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", restartTracking);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", restartTracking);
      clearWatch();
    };
  }, [handleLocationFound, user?.location_sharing_enabled]);

  // Keep the user's presence fresh even while standing still. watchPosition()
  // is change-driven, so a periodic heartbeat re-sends the last known location.
  useEffect(() => {
    if (!user?.location_sharing_enabled) return undefined;

    const heartbeatId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (latestLocationRef.current) {
        uploadLocation(latestLocationRef.current, true);
      }
    }, LOCATION_HEARTBEAT_MS);

    return () => window.clearInterval(heartbeatId);
  }, [uploadLocation, user?.location_sharing_enabled]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;

    async function refreshLiveData() {
      try {
        const [locations, events] = await Promise.all([
          api.getFriendLocations(user.id),
          api.getUserActivities(user.id),
        ]);

        if (active) {
          setFriendLocations(locations);
          setEventPins(events);
        }
      } catch (error) {
        if (active) setLocationError(error.message);
      }
    }

    refreshLiveData();
    const intervalId = window.setInterval(refreshLiveData, FRIEND_POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  return (
    <main className="fullscreen-map-page">
      <MapLibreMap
        currentUser={user}
        currentLocation={currentLocation}
        friendLocations={friendLocations}
        eventPins={eventPins}
        onLocationFound={handleLocationFound}
        enableLocation
      />

      <div className="map-brand-card map-user-card">
        <span
          className={`map-brand-card__dot${
            currentLocation && user?.location_sharing_enabled ? " is-live" : ""
          }`}
        />
        <div>
          <strong>{user?.name || "Outdoor Together"}</strong>
          <span>
            {currentLocation
              ? `${friendLocations.length} друзів • ${eventPins.length} подій`
              : user?.location_sharing_enabled
                ? "Очікуємо геолокацію..."
                : "Передача геолокації вимкнена"}
          </span>
        </div>
      </div>

      {locationError && <div className="map-global-toast">{locationError}</div>}
      <BottomNav />
    </main>
  );
}
