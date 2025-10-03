import { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface DeliveryMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  currentLat?: number | null;
  currentLng?: number | null;
  pickupAddress: string;
  deliveryAddress: string;
}

export function DeliveryMap({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  currentLat,
  currentLng,
  pickupAddress,
  deliveryAddress,
}: DeliveryMapProps) {
  const [mapUrl, setMapUrl] = useState<string>('');

  useEffect(() => {
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      const markers = [
        `color:green|label:P|${pickupLat},${pickupLng}`,
        `color:red|label:D|${deliveryLat},${deliveryLng}`,
      ];

      if (currentLat && currentLng) {
        markers.push(`color:blue|label:Driver|${currentLat},${currentLng}`);
      }

      const url = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&maptype=roadmap&markers=${markers.join(
        '&markers='
      )}&path=color:0x0000ff|weight:2|${pickupLat},${pickupLng}|${deliveryLat},${deliveryLng}&key=YOUR_GOOGLE_MAPS_API_KEY`;

      setMapUrl(url);
    }
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng, currentLat, currentLng]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-400" />
          Delivery Route
        </h3>
      </div>

      <div className="aspect-video bg-slate-800 relative">
        {mapUrl ? (
          <img src={mapUrl} alt="Delivery route map" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Map visualization</p>
              <p className="text-slate-500 text-sm mt-2">GPS coordinates required</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">Pickup Location</div>
            <div className="text-sm text-slate-300">{pickupAddress}</div>
            {pickupLat && pickupLng && (
              <div className="text-xs text-slate-600 mt-1">
                {pickupLat.toFixed(6)}, {pickupLng.toFixed(6)}
              </div>
            )}
          </div>
        </div>

        {currentLat && currentLng && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">Driver Location</div>
              <div className="text-sm text-slate-300">
                {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">Delivery Location</div>
            <div className="text-sm text-slate-300">{deliveryAddress}</div>
            {deliveryLat && deliveryLng && (
              <div className="text-xs text-slate-600 mt-1">
                {deliveryLat.toFixed(6)}, {deliveryLng.toFixed(6)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
