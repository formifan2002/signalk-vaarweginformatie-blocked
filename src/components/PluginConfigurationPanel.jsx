import React, { useState } from 'react';

const PluginConfigurationPanel = ({ configuration, save }) => {
  const [config, setConfig] = useState(configuration || {});
  const [currentLang, setCurrentLang] = useState(config.language ? 'de' : 'en');
  const [initialConfig, setInitialConfig] = useState(configuration);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogData, setDialogData] = useState({ title: '', message: '', callback: null });

  const areaLabels = {
    "All areas": { de: "Alle Gebiete", en: "All areas" },
    "Algemeen Nederland": { de: "Allgemein Niederlande", en: "General Netherlands" },
    "Noordzee": { de: "Nordsee", en: "North Sea" },
    "Eems": { de: "Ems", en: "Ems" },
    "Waddenzee": { de: "Wattenmeer", en: "Wadden Sea" },
    "Groningen": { de: "Groningen", en: "Groningen" },
    "Fryslan": { de: "Friesland", en: "Friesland" },
    "Drenthe": { de: "Drenthe", en: "Drenthe" },
    "Overijssel": { de: "Overijssel", en: "Overijssel" },
    "Gelderland": { de: "Gelderland", en: "Gelderland" },
    "Ijsselmeer": { de: "IJsselmeer", en: "IJsselmeer" },
    "Flevoland": { de: "Flevoland", en: "Flevoland" },
    "Utrecht": { de: "Utrecht", en: "Utrecht" },
    "Noord-Holland": { de: "Nordholland", en: "North Holland" },
    "Zuid-Holland": { de: "Südholland", en: "South Holland" },
    "Zeeland": { de: "Zeeland", en: "Zeeland" },
    "Noord-Brabant": { de: "Nordbrabant", en: "North Brabant" },
    "Limburg": { de: "Limburg", en: "Limburg" }
  };

  const areaOrder = [
    "All areas",
    "Algemeen Nederland",
    "Drenthe",
    "Eems",
    "Flevoland",
    "Fryslan",
    "Gelderland",
    "Groningen",
    "Ijsselmeer",
    "Limburg",
    "Noord-Brabant",
    "Noord-Holland",
    "Noordzee",
    "Overijssel",
    "Utrecht",
    "Waddenzee",
    "Zeeland",
    "Zuid-Holland"
  ];

  const translations = {
    de: {
      title: "Konfiguration 'signalk-vaarweginformatie-blocked'",
      description: 'Das Plugin stellt die Informationen von vaarweginformatie.nl über aktuell und zukünftig gesperrte Schleusen, Brücken und Wasserwege in den Niederlanden bereit.',
      generalLegend: "Allgemein",
      languageLabel: "Sprache:",
      languageHelp: "Auswahl der Sprache für Dialog und Felder in der Schnittstelle",
      areasLegend: "Gebiete",
      paramsLegend: "Parameter",
      pollInterval: "Poll-Intervall (Stunden):",
      pollHelp: 'Abfrageintervall der Informationen von vaarweginformatie.nl in Stunden (Standard: 24)',
      daysSpan: "Zeitraum (Tage):",
      daysHelp: "Anzahl Tage von heute an gerechnet (maximal 60)",
      routesPath: "Dateiname gesperrte Wasserwege:",
      routesHelp: "Pfad + Dateiname der GPX-Datei mit gesperrten Wasserwegen für OpenCPN (als permanenter Layer). Bei leerem Feld erfolgt keine Dateierzeugung",
      waypointsPath: "Dateiname gesperrte Schleusen und Brücken:",
      waypointsHelp: "Pfad + Dateiname der GPX-Datei mit gesperrten Schleusen und Brücken für OpenCPN (als permanenter Layer). Bei leerem Feld erfolgt keine Dateierzeugung",
      moveMeters: "Punktverschiebung (m):",
      moveHelp: "Punktverschiebung nach rechts in Metern (zur Vermeidung von Überlagerungen)",
      pointSize: "Punktgröße:",
      sizeHelp: "Größe der Punkte auf der Karte von freeboard-sk",
      color: "Farbe:",
      colorHelp: "Farbe der Punkte",
      save: "Speichern",
      cancel: "Abbruch",
      unsavedWarning: "Es gibt ungespeicherte Änderungen. Wirklich abbrechen?",
      unsavedTitle: "Ungespeicherte Änderungen",
      yes: "Ja",
      no: "Nein"
    },
    en: {
      title: "Configuration 'signalk-vaarweginformatie-blocked'",
      description: 'The plugin provides information from vaarweginformatie.nl about currently and future blocked locks, bridges and waterways in the Netherlands.',
      generalLegend: "General",
      languageLabel: "Language:",
      languageHelp: "Selection of language for dialogs and fields in the interface",
      areasLegend: "Areas",
      paramsLegend: "Parameters",
      pollInterval: "Poll interval (hours):",
      pollHelp: 'Poll interval for information from vaarweginformatie.nl in hours (default: 24)',
      daysSpan: "Time span (days):",
      daysHelp: "Number of days from today (maximum 60)",
      routesPath: "Filename blocked waterways:",
      routesHelp: "Path + filename of GPX file with blocked waterways for OpenCPN (as permanent layer). No file generation if field is empty",
      waypointsPath: "Filename blocked locks and bridges:",
      waypointsHelp: "Path + filename of GPX file with blocked locks and bridges for OpenCPN (as permanent layer). No file generation if field is empty",
      moveMeters: "Move point (m):",
      moveHelp: "Point offset to the right in meters (to avoid overlaps)",
      pointSize: "Point size:",
      sizeHelp: "Size of points on the freeboard-sk map",
      color: "Color:",
      colorHelp: "Color of the points",
      save: "Save",
      cancel: "Cancel",
      unsavedWarning: "There are unsaved changes. Really cancel?",
      unsavedTitle: "Unsaved changes",
      yes: "Yes",
      no: "No"
    }
  };

  const t = translations[currentLang];

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleAreaToggle = (area) => {
    if (area === 'All areas') {
      if (config['All areas']) {
        setConfig(prev => ({ ...prev, 'All areas': false }));
      } else {
        const newConfig = { ...config, 'All areas': true };
        areaOrder.forEach(a => { if (a !== 'All areas') newConfig[a] = false; });
        setConfig(newConfig);
      }
    } else {
      setConfig(prev => ({
        ...prev,
        [area]: !prev[area],
        'All areas': false
      }));
    }
  };

  const checkUnsavedChanges = () => {
    return JSON.stringify(config) !== JSON.stringify(initialConfig);
  };

  const handleSave = () => {
    setLoading(true);
    if (save) {
      save(config).then(() => {
        setStatus('success');
        setInitialConfig(config);
        setTimeout(() => setStatus(''), 3000);
      }).catch(err => {
        setStatus('error');
        setTimeout(() => setStatus(''), 3000);
      }).finally(() => {
        setLoading(false);
      });
    }
  };

  const handleFileSelect = (inputId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gpx';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const fullPath = file.path || file.webkitRelativePath || `/path/to/${file.name}`;
        handleConfigChange(inputId === 'routesPath' ? 'openCpnGeoJsonPathRoutes' : 'openCpnGeoJsonPathWaypoints', fullPath);
      }
    };
    input.click();
  };

  const areDisabled = config['All areas'];

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t.generalLegend}</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>{t.languageLabel}</label>
          <select
            value={currentLang}
            onChange={(e) => setCurrentLang(e.target.value)}
            style={styles.select}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
          <small style={styles.help}>{t.languageHelp}</small>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t.areasLegend}</h3>
        <div style={styles.areasGrid}>
          {areaOrder.sort((a, b) => {
            if (a === 'All areas') return -1;
            if (b === 'All areas') return 1;
            return areaLabels[a][currentLang].localeCompare(areaLabels[b][currentLang]);
          }).map(area => (
            <label key={area} style={styles.checkbox}>
              <input
                type="checkbox"
                checked={config[area] || false}
                onChange={() => handleAreaToggle(area)}
                disabled={area !== 'All areas' && areDisabled}
              />
              {areaLabels[area][currentLang]}
            </label>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{t.paramsLegend}</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t.pollInterval}</label>
          <input
            type="number"
            min="1"
            value={config.pollIntervalHours || 24}
            onChange={(e) => handleConfigChange('pollIntervalHours', Number(e.target.value))}
            style={styles.input}
          />
          <small style={styles.help}>{t.pollHelp}</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t.daysSpan}</label>
          <input
            type="number"
            min="1"
            max="60"
            value={config.daysSpan || 14}
            onChange={(e) => handleConfigChange('daysSpan', Number(e.target.value))}
            style={styles.input}
          />
          <small style={styles.help}>{t.daysHelp}</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t.routesPath}</label>
          <div style={styles.inputWithButton}>
            <input
              type="text"
              value={config.openCpnGeoJsonPathRoutes || ''}
              onChange={(e) => handleConfigChange('openCpnGeoJsonPathRoutes', e.target.value)}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => handleFileSelect('routesPath')}
              style={styles.fileButton}
            >
              📁
            </button>
          </div>
          <small style={styles.help}>{t.routesHelp}</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t.waypointsPath}</label>
          <div style={styles.inputWithButton}>
            <input
              type="text"
              value={config.openCpnGeoJsonPathWaypoints || ''}
              onChange={(e) => handleConfigChange('openCpnGeoJsonPathWaypoints', e.target.value)}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => handleFileSelect('waypointsPath')}
              style={styles.fileButton}
            >
              📁
            </button>
          </div>
          <small style={styles.help}>{t.waypointsHelp}</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t.moveMeters}</label>
          <input
            type="number"
            min="0"
            value={config.movePointMeters || 0}
            onChange={(e) => handleConfigChange('movePointMeters', Number(e.target.value))}
            style={styles.input}
          />
          <small style={styles.help}>{t.moveHelp}</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t.pointSize}</label>
          <input
            type="number"
            min="1"
            value={config.pointSize || 5}
            onChange={(e) => handleConfigChange('pointSize', Number(e.target.value))}
            style={styles.input}
          />
          <small style={styles.help}>{t.sizeHelp}</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>{t.color}</label>
          <input
            type="color"
            value={config.colorHex || '#FF0000'}
            onChange={(e) => handleConfigChange('colorHex', e.target.value)}
            style={styles.colorInput}
          />
          <small style={styles.help}>{t.colorHelp}</small>
        </div>
      </div>

      {status && (
        <div style={{...styles.statusMessage, ...(status === 'error' ? styles.error : styles.success)}}>
          {status === 'success' ? 'Konfiguration gespeichert' : 'Fehler beim Speichern'}
        </div>
      )}

      <div style={styles.buttonGroup}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{...styles.button, ...styles.primaryButton}}
        >
          {t.save}
        </button>
        <button
          onClick={() => {
            if (checkUnsavedChanges()) {
              setDialogData({
                title: t.unsavedTitle,
                message: t.unsavedWarning,
                callback: () => setConfig(initialConfig)
              });
              setShowDialog(true);
            } else {
              setConfig(initialConfig);
            }
          }}
          style={{...styles.button, ...styles.secondaryButton}}
        >
          {t.cancel}
        </button>
      </div>

      {showDialog && (
        <div style={styles.dialog}>
          <div style={styles.dialogContent}>
            <h4 style={styles.dialogTitle}>{dialogData.title}</h4>
            <p>{dialogData.message}</p>
            <div style={styles.dialogButtons}>
              <button
                onClick={() => setShowDialog(false)}
                style={{...styles.button, ...styles.secondaryButton}}
              >
                {t.no}
              </button>
              <button
                onClick={() => {
                  if (dialogData.callback) dialogData.callback();
                  setShowDialog(false);
                }}
                style={{...styles.button, ...styles.primaryButton}}
              >
                {t.yes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '1.2em',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#333',
    borderBottom: '2px solid #667eea',
    paddingBottom: '10px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    fontWeight: '500',
    marginBottom: '5px',
    color: '#333',
  },
  input: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1em',
    width: '200px',
  },
  colorInput: {
    width: '60px',
    height: '40px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  select: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1em',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  areasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
  },
  help: {
    display: 'block',
    fontSize: '0.85em',
    color: '#666',
    marginTop: '5px',
    fontStyle: 'italic',
  },
  inputWithButton: {
    display: 'flex',
    gap: '5px',
  },
  fileButton: {
    padding: '8px 12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #ddd',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1em',
  },
  primaryButton: {
    backgroundColor: '#667eea',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  statusMessage: {
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '0.95em',
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  dialog: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialogContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  dialogTitle: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '1.1em',
  },
  dialogButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
  }
};

export default PluginConfigurationPanel;