# signalk-vaarweginformatie-blocked

A SignalK server plugin that fetches blocked waterways from the Dutch [vaarweginformatie.nl](https://www.vaarweginformatie.nl) API and displays them on navigation charts in Freeboard-SK and OpenCPN.

## Features

- **Automatic updates** of blocked waterways in the Netherlands
- **Two display modes:**
  - **Points** for single-location blockages (displayed as markers)
  - **Routes** for multi-point blockages (displayed as lines)
- **Freeboard-SK integration** via SignalK Resource Provider API
- **OpenCPN support** via GPX file export
- **Regional filtering** - select specific Dutch provinces/areas
- **Configurable styling** - customize point size and color
- **Smart grouping** - multiple blockages at the same location are combined
- **Automatic cleanup** - old blockages are removed on each update
- **Web-based configuration** - modern, user-friendly configuration interface

## Installation

### Via SignalK App Store
1. Open SignalK Admin Panel
2. Navigate to **Appstore** → **Available**
3. Search for "vaarweginformatie"
4. Click **Install**

### Manual Installation
```bash
cd ~/.signalk/node_modules/
git clone https://github.com/formifan2002/signalk-vaarweginformatie-blocked.git
cd signalk-vaarweginformatie-blocked
npm install
```

Then restart SignalK server.

## Configuration

Configure the plugin via the web interface at:
`http://<YOUR_SIGNALK_IP>:<YOUR_SIGNALK_PORT>/plugins/signalk-vaarweginformatie-blocked`

Or in **SignalK Admin** → **Server** → **Plugin Config** → **signalk-vaarweginformatie-blocked**

### General Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Language** | Interface language (German/English) | German |
| **Plugin enabled** | Enable/disable the plugin | `true` |
| **Data logging enabled** | Enable data logging | `false` |
| **Debug log enabled** | Enable debug logging | `false` |

### Regional Selection

| Parameter | Description | Default |
|-----------|-------------|---------|
| **All areas** | Fetch blockages from all regions in the Netherlands | `true` |
| **Algemeen Nederland** | General Netherlands | `false` |
| **Noordzee** | North Sea | `false` |
| **Eems** | Ems | `false` |
| **Waddenzee** | Wadden Sea | `false` |
| **Groningen** | Groningen province | `false` |
| **Fryslan** | Friesland province | `false` |
| **Drenthe** | Drenthe province | `false` |
| **Overijssel** | Overijssel province | `false` |
| **Gelderland** | Gelderland province | `false` |
| **Ijsselmeer** | IJsselmeer | `false` |
| **Flevoland** | Flevoland province | `false` |
| **Utrecht** | Utrecht province | `false` |
| **Noord-Holland** | North Holland province | `false` |
| **Zuid-Holland** | South Holland province | `false` |
| **Zeeland** | Zeeland province | `false` |
| **Noord-Brabant** | North Brabant province | `false` |
| **Limburg** | Limburg province | `false` |

**Note:** When "All areas" is enabled, specific region selections are ignored. At least one region must be selected.

### Update Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Poll interval (hours)** | How often to fetch new data from vaarweginformatie.nl | `24` hours |
| **Time span (days)** | How many days ahead to fetch blockage data (max 60) | `7` days |

### Display Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Point offset (meters)** | Shift blockage markers to the right to avoid overlap | `5` meters |
| **Point size** | Marker size on the chart | `10` |
| **Color** | Marker color (hex value) | `#FF0000` (red) |

### OpenCPN Export

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Filename blocked waterways** | Path + filename for GPX file with blocked waterways (routes) | (empty) |
| **Filename blocked locks and bridges** | Path + filename for GPX file with blocked locks/bridges (waypoints) | (empty) |

Example paths: 
- `/home/pi/.opencpn/layers/blocked-waterways.gpx`
- `/home/pi/.opencpn/layers/blocked-locks.gpx`

**Note:** Files are only created if a path is specified.

## How It Works

### Data Processing

1. **API Query**: The plugin fetches blockage data from vaarweginformatie.nl based on your regional and time settings
2. **Coordinate Grouping**: Multiple blockages at the same location (within ~1m) are grouped together
3. **Type Detection**:
   - **Single coordinate** → Displayed as a point marker
   - **Multiple coordinates** → Displayed as a route line
4. **Resource Creation**:
   - Points are stored in the `Sperrungen` (German) or `Closures` (English) resource set
   - Routes are stored in the standard SignalK `routes` resource

### Display in Freeboard-SK

After plugin activation, blockages appear automatically in Freeboard-SK:

1. Open Freeboard-SK
2. Click the **menu icon** (☰)
3. Select **Resources**
4. Click **Load Resource**
5. Enable:
   - **Sperrungen/Closures** (for blockage points)
   - **routes** will include blockage routes alongside your other routes

**Direct API Access:**
- Blocked locks/bridges: `http://<YOUR_SIGNALK_IP>:<PORT>/signalk/v2/api/resources/Sperrungen` (or `Closures`)
- Blocked waterways: `http://<YOUR_SIGNALK_IP>:<PORT>/signalk/v2/api/resources/routes`

### Blockage Information

When you click on a blockage marker or route in Freeboard-SK, you'll see:

- **Name**: Location name (e.g., "Zeelandbrug")
- **Description**: Blockage period(s)
  - Single blockage: `von 26.11.2025 14:00 bis 27.11.2025 18:00`
  - Same-day blockage: `von 26.11.2025 14:00 bis 18:00`
  - Open-ended: `ab 26.11.2025 14:00` (no end date)
  - Multiple blockages: Separated by ` | `
- **Distance**: (Routes only) Total route length in meters
- **Fairway**: Name of the waterway (if available)

### OpenCPN Integration

The plugin can export blockages as GPX files for use as permanent layers in OpenCPN:

1. **Configure paths** in the plugin settings
2. **GPX files are created** with:
   - Waypoints for blocked locks and bridges
   - Routes for blocked waterways
3. **Load in OpenCPN**:
   - Right-click on map → **Import Layer** → Select GPX file
   - The layer will be displayed as a permanent overlay

**GPX File Features:**
- Proper waypoint symbols (X-Large-Red for objects)
- Route waypoints with diamond markers
- Time information for planned departures
- Scale-dependent visibility

## Web Configuration Interface

The plugin includes a modern web-based configuration interface accessible at:
`http://<YOUR_SIGNALK_IP>:<PORT>/plugins/signalk-vaarweginformatie-blocked`

**Features:**
- Bilingual interface (German/English)
- Real-time validation
- Plugin enable/disable switches
- Direct links to resource endpoints
- Automatic plugin restart after saving
- Unsaved changes detection
- Modern, responsive design

## API Source

Data is provided by [vaarweginformatie.nl](https://www.vaarweginformatie.nl), the official Dutch waterway information service managed by Rijkswaterstaat.

**API Endpoint**: `https://www.vaarweginformatie.nl/frp/api/messages/nts/summaries`

**Data includes:**
- Location coordinates
- Blockage start and end times
- Affected waterway names
- Blockage type: `BLOCKED` (complete closure)

## Technical Details

### Resource Provider API

This plugin uses the SignalK Resource Provider API to register two providers:

1. **`Sperrungen`/`Closures`** resource type - For blockage point markers
2. **`routes`** resource type - For blockage route lines

Both resources support:
- `listResources()` - List all blockages
- `getResource(id)` - Get specific blockage details
- `deleteResource(id)` - Remove blockages (plugin-created only)

### Memory Management

The plugin implements proper memory cleanup:
- Cache is cleared on each update
- Resources are removed when the plugin stops
- Only plugin-created routes can be deleted (your manual routes are safe)

### Performance

- **API calls**: Once per configured interval (default: 24 hours)
- **Data caching**: In-memory storage for instant access
- **Automatic cleanup**: Old blockages are removed on each update
- **Point offset**: Markers are shifted to avoid overlapping

## Troubleshooting

### No blockages appear in Freeboard-SK

1. Check plugin status in **SignalK Admin** → **Server** → **Plugin Config**
2. Verify **Plugin enabled** switch is ON
3. Verify "All areas" is enabled or specific regions are selected
4. Check debug logs: `journalctl -u signalk.service -f`
5. Try manually triggering an update by restarting the plugin

### Points overlap on the chart

Increase the **Point offset in meters** parameter to shift markers further apart (default: 5m).

### API errors / no data

- Check your internet connection
- Verify vaarweginformatie.nl is accessible
- Reduce the number of days (API might limit very large requests)
- Check if you've selected at least one region

### Plugin won't start

Check the SignalK logs for errors:
```bash
journalctl -u signalk.service -n 100
```

If you see JSON parsing errors, reset the plugin configuration in the SignalK Admin panel.

### GPX files not created

- Verify the file path is writable by the SignalK user
- Check that the directory exists (create it if needed)
- Ensure file path is specified in configuration
- Check SignalK logs for file write errors

## Configuration Examples

### Example 1: Zeeland Region Only
```json
{
  "language": true,
  "All areas": false,
  "Zeeland": true,
  "pollIntervalHours": 12,
  "daysSpan": 14,
  "movePointMeters": 5,
  "pointSize": 12,
  "colorHex": "#FF0000"
}
```

### Example 2: All Areas with OpenCPN Export
```json
{
  "language": false,
  "All areas": true,
  "pollIntervalHours": 24,
  "daysSpan": 30,
  "openCpnGeoJsonPathRoutes": "/home/pi/.opencpn/layers/blocked-routes.gpx",
  "openCpnGeoJsonPathWaypoints": "/home/pi/.opencpn/layers/blocked-objects.gpx",
  "movePointMeters": 10,
  "pointSize": 11,
  "colorHex": "#FF6600"
}
```

## Development

### Project Structure
```
signalk-vaarweginformatie-blocked/
├── index.js           # Main plugin file
├── index.html         # Web configuration interface
├── icon.png          # Plugin icon
├── package.json      # NPM package configuration
└── README.md         # This file
```

### Building from Source
```bash
git clone https://github.com/formifan2002/signalk-vaarweginformatie-blocked.git
cd signalk-vaarweginformatie-blocked
npm install
```

## Contributing

Contributions are welcome! Please submit issues and pull requests on GitHub.

**Repository**: [https://github.com/formifan2002/signalk-vaarweginformatie-blocked](https://github.com/formifan2002/signalk-vaarweginformatie-blocked)

## License

MIT License - see LICENSE file for details

## Credits

- **Data source**: [vaarweginformatie.nl](https://www.vaarweginformatie.nl) (Rijkswaterstaat)
- **Author**: Dirk Behrendt
- **SignalK**: [https://signalk.org](https://signalk.org)
- **Freeboard-SK**: [https://github.com/SignalK/freeboard-sk](https://github.com/SignalK/freeboard-sk)

## Changelog

### Version 1.0.0
- Initial release
- Support for all Dutch regions
- Point and route display modes
- Freeboard-SK integration via Resource Provider API
- OpenCPN GPX export (routes and waypoints)
- Web-based configuration interface
- Bilingual support (German/English)
- Configurable styling and update intervals
- Smart coordinate grouping
- Automatic cleanup of old blockages
- Point offset to avoid overlapping markers