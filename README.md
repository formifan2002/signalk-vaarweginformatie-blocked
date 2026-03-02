# SignalK Vaarweginformatie BLOCKED Plugin

Ein SignalK-Plugin, das gesperrte Wasserwege und Objekte (Schleusen, Brücken, etc.) von [vaarweginformatie.nl](https://vaarweginformatie.nl) abruft und über die SignalK Resource Provider API, als Notes, sowie als GPX-Dateien für OpenCPN bereitstellt.

<img src="https://raw.githubusercontent.com/formifan2002/signalk-vaarweginformatie-blocked/master/public/icon.png" alt="Icon" width="100" >


## Features

### 🗺️ Interaktive Kartenansicht
- Visualisierung gesperrter Wasserwege und Objekte auf einer interaktiven Karte
- OpenStreetMap und OpenSeaMap Integration
- Detaillierte Popup-Informationen mit verlinkten Berichten
- Filterung nach Datum/Zeitraum
- Suchfunktion für Sperrungen
- Direkter Zoom auf eigenes Schiff (Voraussetzung: Datenpunkt navigation.position in Signal existiert)
- Ein-/Ausblenden von Wasserwegen und Sperrungen
- Anzeige von AIS Zielen (Voraussetzung: plugin [signalk-ais-navionics-converter](https://github.com/formifan2002/signalk-ais-navionics-converter]) ist installiert und aktiviert)
- Übersetzung von niederländischem Text in Deutsch/Englisch (Voraussetzung: API key von deepl.com vorhanden)
- Nur Kartenanzeige (ohne Plugin-Konfiguration) mit http://<SIGNALK_IP>:<SIGNALK_PORT>/signalk-vaarweginformatie-blocked/?mode=map

<img src="https://raw.githubusercontent.com/formifan2002/signalk-vaarweginformatie-blocked/main/map.png"
     width="75%"
     style="margin-left: 20px;" />

### 📡 SignalK Integration
- Bereitstellung als SignalK Resource Sets und Notes (für gesperrte Objekte wie Brücken, Schleusen,..)
- Automatische Aktualisierung in konfigurierbaren Intervallen
- Kompatibel mit Freeboard-SK und anderen SignalK-Clients
- RESTful API-Zugriff auf alle Daten

### 🧭 OpenCPN Support
- Automatische Generierung von GPX-Dateien
- Separate Dateien für Routen (Wasserwege) und Waypoints (Objekte) durch z.B. permanente Layer
- Farbcodierung und Symbolik für optimale Sichtbarkeit

### 🌍 Mehrsprachigkeit
- Deutsch und Englisch für alle UI-Elemente
- Übersetzung aller niederländischen Beschreibungen in den Daten aus der API von [vaarweginformatie.nl](https://vaarweginformatie.nl)  in Deutsch oder Englisch (nur mit vorhandenem API key von deepl.com) 
- Speicherung von Übersetzungen in lokalem Cache (wird automatisch nach 30 Tagen gelöscht)
- Füge eigene Übersetzungen über die API hinzu (Details Server → OpenApi, dann oben rechts in "Select definition" das Plugin "plugins/signalk-vaarweginformatie-blocked" auswählen)

### ⚙️ Flexible Konfiguration
- Auswahl spezifischer Regionen in den Niederlanden
- Konfigurierbare Abfrageintervalle
- Anpassbare Zeitspannen (1-n Tage)
- Individuelle Farben und Punktgrößen
- Punktverschiebung zur besseren Kartendarstellung

## Installation

### Über den SignalK App Store (empfohlen)
1. Öffne SignalK Server
2. Navigiere zu **Appstore** → **Available**
3. Suche nach "vaarweginformatie"
4. Klicke auf **Install**

Nach der Installation starte den SignalK Server neu.

## Konfiguration

### Zugriff auf die Konfiguration
- **Web-Interface**: Öffne `http://<SIGNALK_IP>:<SIGNALK_PORT>/plugins/signalk-vaarweginformatie-blocked/`
- **SignalK Admin**: Server → Plugin Config → Vaarweginformatie BLOCKED
- **SignalK Admin**: Server → WebApps → Vaarweginformatie BLOCKED

### Konfigurationsoptionen

#### Allgemeine Einstellungen
- **Plugin aktiviert**: Ein-/Ausschalten des Plugins
- **Logging aktivieren**: Aktiviert detaillierte Logging-Ausgaben
- **Debug-Modus**: Aktiviert erweiterte Debug-Informationen
- **Sprache**: Deutsch oder Englisch

#### Regionsauswahl
Wähle die zu überwachenden Gebiete:
- **Alle Gebiete**: Überwacht alle Regionen in den Niederlanden
- **Einzelne Regionen**: 
  - Algemeen Nederland
  - Noordzee (Nordsee)
  - Eems
  - Waddenzee (Wattenmeer)
  - Groningen
  - Fryslan (Friesland)
  - Drenthe
  - Overijssel
  - Gelderland
  - IJsselmeer
  - Flevoland
  - Utrecht
  - Noord-Holland (Nordholland)
  - Zuid-Holland (Südholland)
  - Zeeland
  - Noord-Brabant (Nordbrabant)
  - Limburg

#### Parameter
- **Abfrageintervall** (Stunden): Wie oft neue Daten abgerufen werden (Standard: 24)
- **Zeitspanne** (Tage): Wie viele Tage in die Zukunft soll geprüft / die Daten von [vaarweginformatie.nl](https://vaarweginformatie.nl) abgerufen werden (Standard: 120)
- **Deepl API Schlüssel**  API Schlüssel von deepl.com für die Übersetzung von erweiternden Texten zu Sperrungen (leer=keine Übersetzung)
- **Punktverschiebung** (Meter): Versetzt Punkte nach Osten für bessere Sichtbarkeit und Vermeidung von Überschneidungen (Standard: 5)
- **Punktgröße**: Radius der Marker auf der Karte (Standard: 10)
- **Farbe**: Hex-Farbcode für Marker in Freeboard-SK und OpenCPN sowie Linien in OpenCPN (Standard: #FF0000)

#### OpenCPN Integration
- **Routen-GPX-Pfad**: Vollständiger Pfad zur GPX-Datei für gesperrte Wasserwege
  - Beispiel: `/home/user/.opencpn/routes_blocked.gpx`
- **Waypoints-GPX-Pfad**: Vollständiger Pfad zur GPX-Datei für gesperrte Objekte
  - Beispiel: `/home/user/.opencpn/waypoints_blocked.gpx`
- Navigiere zu **Werkzeuge** → **Route & Mark-Manager** → **Layer**  → **Dauerhaftes Layer erstellen**

## Nutzung

### Web-Ansicht

#### Konfigurationsansicht
- Ändere Einstellungen über das Formular
- Klicke auf **Speichern** um Änderungen zu übernehmen
- **Neustart**: Startet das Plugin neu (nur wenn Plugin aktiviert ist)
- **Zurück**: Kehrt zur vorherigen Seite zurück (mit Warnung bei ungespeicherten Änderungen)

#### Kartenansicht
- Wechsle über die Toggle-Buttons oben (alternativ direkter Aufruf über den Browser mit http://<SIGNALK_IP>:<SIGNALK_PORT>/signalk-vaarweginformatie-blocked/?mode=map)
- **Wasserwege**: Zeigt/versteckt gesperrte Routen (rote Linien)
- **Sperrungen**: Zeigt/versteckt gesperrte Objekte (rote Punkte)
- **Datumsfilter**: Filtere Sperrungen nach Zeitraum
  - Vordefinierte Filter: Heute, Alle
  - Benutzerdefiniert: Wähle Start- und Enddatum
- **Suche**: Suche nach Namen von Sperrungen, Wasserwegen oder MMSI für AIS Ziele (Voraussetzung: plugin [signalk-ais-navionics-converter](https://github.com/formifan2002/signalk-ais-navionics-converter]) ist installiert und aktiviert) - **Popup-Details**: Klicke auf Marker oder Linien für detaillierte Informationen

### Resource Sets abrufen
- Sperrungen (Objekte) - je nach Spracheinstellung: http://<SIGNALK_IP>:<SIGNALK_PORT>/signalk/v2/api/resources/Sperrungen oder http://<SIGNALK_IP>:<SIGNALK_PORT>/signalk/v2/api/resources/Closures 
- Wasserwege (Routen): http://<SIGNALK_IP>:<SIGNALK_PORT>/signalk/v2/api/resources/routes

### Freeboard-SK Integration
1. Öffne Freeboard-SK
2. Navigiere in den **Settings** zu **Ressourcen**
3. Die Sperrungen erscheinen automatisch unter **Custom Resoures** als "Sperrungen" oder "Closures" (je nach Spracheinstellung im Plugin)
4. Sobald 3. aktiviert wurde, erscheint im Menü („Routes, Waypoints, Notes, Regions, …“) ganz unten der zusätzliche Punkt „Sperrungen“. Nach dem Anklicken dieses Menüpunktes lassen sich die Regionen einzeln ein‑ oder ausschalten
5. Gesperrte Wasserwege erscheinen automatisch unter "Routes" (ohne weitere Konfiguration in SignalK)
6. Die Sperrungen (nicht gesperrte Wasserwege) stehen auch als "Notes" zur Verfügung und werden automatisch beim Zommen in der Karte angezeigt (Voraussetzung: "Display Notes" ist in den freeboard-sk settins aktiviert)

### OpenCPN Integration
1. Konfiguriere die GPX-Dateipfade im Plugin
2. Öffne OpenCPN
3. Importiere die GPX-Dateien:
   - **Routen**: `Datei` → `Route importieren` → Deine Routen-GPX-Datei
   - **Waypoints**: `Datei` → `Wegpunkte importieren` → Deine Waypoints-GPX-Datei
4. **Optional - Permanente Layer**: Speichere die importierten Daten als permanente Layer in OpenCPN, damit sie bei jedem Start automatisch geladen werden:
   - Nach dem Import: Rechtsklick auf die Route/Waypoint-Gruppe → `Als Layer speichern`
   - Oder kopiere die GPX-Dateien in das OpenCPN-Layers-Verzeichnis (z.B. `~/.opencpn/layers/`)
5. Die Sperrungen werden auf der Karte angezeigt

## Fehlerbehebung

### Plugin startet nicht
- Überprüfe die SignalK Server-Logs: `~/.signalk/logs/`
- Stelle sicher, dass alle Abhängigkeiten installiert sind
- Prüfe, ob der Port 3000 verfügbar ist

### Keine Daten werden angezeigt
- Aktiviere Logging in den Plugin-Einstellungen
- Überprüfe die Regionsauswahl
- Prüfe die Internetverbindung zu [vaarweginformatie.nl](https://vaarweginformatie.nl) 
- Erhöhe ggf. die Zeitspanne (daysSpan)

### GPX-Dateien werden nicht erstellt
- Stelle sicher, dass der angegebene Pfad existiert und beschreibbar ist
- Verwende absolute Pfade
- Überprüfe die Dateiberechtigungen

### Kartenansicht lädt nicht
- Überprüfe die Browser-Konsole auf Fehler
- Stelle sicher, dass JavaScript aktiviert ist
- Leere den Browser-Cache

## Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details

## Autor

formifan2002

## Links

- **GitHub**: [https://github.com/formifan2002/signalk-vaarweginformatie-blocked](https://github.com/formifan2002/signalk-vaarweginformatie-blocked)
- **NPM**: [https://www.npmjs.com/package/signalk-vaarweginformatie-blocked](https://www.npmjs.com/package/signalk-vaarweginformatie-blocked)
- **SignalK**: [https://signalk.org](https://signalk.org)
- **Vaarweginformatie**: [https://vaarweginformatie.nl](https://vaarweginformatie.nl)

## Changelog

### Version 1.0.0
- Initiales Release
### Version 1.0.1
- Optimization/enhancement of GPX file output
- minor bug corrections
### Version 1.0.2
 - Changed to "Embedded Plugin Configuration Forms"
### Version 1.0.3
 - Minor bugfixes
 ### Version 1.0.4
 - Adjustments for mobile map view
 ### Version 1.0.5
 - AIS class A/B differentiation added (prerequiste for AIS feature is the installation and activation of the plugin [signalk-ais-navionics-converter])(https://github.com/formifan2002/signalk-ais-navionics-converter])
  ### Version 1.0.6
 - Closures (not routes) are provided as SignalK notes and can be used by freeboard-sk
 - OpenAPI added
 - Function to translate Dutch text into German or English implemented (prerequisite: Deepl API key available)
 - ROT changed from °/m to °/s
 - Feature to show only vessels with SOG>0 added in map view
 - Optimized detailled view for route closures
 - Minimized API calls
 - Bug corrections: 
    - more than 1 entries for the same object were not reported correctly
    - minor bugs corrected
  ### Version 1.0.7
  - Minor bug correction for generation of links in descriptions