import { useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

const DEFAULT_CENTER = [48.9226, 24.7111];

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function CheckpointMap({
  checkpoints,
  canEdit,
  onCreateCheckpoint,
}) {
  const [selected, setSelected] = useState(null);

  async function addCheckpoint() {
    if (!selected) {
      return;
    }

    const title = window.prompt("Назва контрольної точки:");

    if (!title?.trim()) {
      return;
    }

    await onCreateCheckpoint({
      title: title.trim(),
      description: "",
      latitude: selected.latitude,
      longitude: selected.longitude,
      order_index: checkpoints.length + 1,
    });

    setSelected(null);
  }

  return (
    <div>
      {canEdit && (
        <p className="hint">
          Натисніть на карту, щоб вибрати місце нової контрольної точки.
        </p>
      )}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={13}
        className="map"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {canEdit && (
          <MapClickHandler onPick={setSelected} />
        )}

        {checkpoints.map((checkpoint) => (
          <Marker
            key={checkpoint.id}
            position={[checkpoint.latitude, checkpoint.longitude]}
          >
            <Popup>
              <strong>{checkpoint.title}</strong>
              {checkpoint.description && (
                <div>{checkpoint.description}</div>
              )}
            </Popup>
          </Marker>
        ))}

        {selected && (
          <Marker position={[selected.latitude, selected.longitude]}>
            <Popup>
              Нова точка
              <br />
              <button type="button" onClick={addCheckpoint}>
                Додати тут
              </button>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
