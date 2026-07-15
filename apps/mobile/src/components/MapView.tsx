import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '@/design/tokens';

interface MapLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

interface MapViewProps {
  userLocation: MapLocation;
  places?: (MapLocation & { estimatedCost?: string })[];
  height?: number;
}

function generateLeafletHtml(userLocation: MapLocation, places?: MapViewProps['places']): string {
  const markers = places || [];
  const markersJs = markers
    .map(
      (p, i) => `
        L.marker([${p.latitude}, ${p.longitude}])
          .addTo(map)
          .bindPopup('<b>${p.name || 'Place ' + (i + 1)}</b>${p.estimatedCost ? '<br/>' + p.estimatedCost : ''}');
      `,
    )
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; }
    #map { width: 100%; height: 100vh; border-radius: 12px; }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${userLocation.latitude}, ${userLocation.longitude}],
      zoom: 15,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // User location marker (blue)
    L.marker([${userLocation.latitude}, ${userLocation.longitude}], {
      icon: L.divIcon({
        className: '',
        html: '<div style="background:#FF8A65;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
    })
    .addTo(map)
    .bindPopup('<b>You are here</b>');

    ${markersJs}
  </script>
</body>
</html>`;
}

export default function MapView({ userLocation, places, height = 250 }: MapViewProps) {
  // Memoize HTML so WebView doesn't fully reload on every parent render.
  // Without this, generateLeafletHtml() creates a new string each render,
  // causing the WebView to re-fetch Leaflet JS + OSM tiles from CDN.
  const html = useMemo(() => generateLeafletHtml(userLocation, places), [userLocation, places]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
