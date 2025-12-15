class VaarweginformatieApiBridge {
  constructor() {
    this.configUrl = '/plugins/signalk-vaarweginformatie-blocked/config';
    this.restartUrl = '/plugins/signalk-vaarweginformatie-blocked/restart';
    const port = window.location.port ? `:${window.location.port}` : '';
    const baseUrl = `${window.location.protocol}//${window.location.hostname}${port}`;
    this.apiBase = `${baseUrl}/signalk/v1/api`;          // für Positionsdaten
    this.apiBaseResources = `${baseUrl}/signalk/v2/api/resources`; // für Resources
  }

  async getConfig() {
    try {
      const response = await fetch(this.configUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Config load error:', err);
      return {
        configuration: {},
        enabled: true,
        enableLogging: false,
        enableDebug: false
      };
    }
  }

  async saveConfig(payload) {
    try {
      const response = await fetch(this.configUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Config save error:', err);
      throw err;
    }
  }

  async restartPlugin() {
    try {
      const response = await fetch(this.restartUrl, { method: 'POST' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Plugin restart error:', err);
      throw err;
    }
  }

  async getClosures(language = 'de') {
    try {
      const resourceType = language === 'de' ? 'Sperrungen' : 'Closures';
      const url = `${this.apiBaseResources}/${resourceType}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Closures load error:', err);
      return [];
    }
  }

  async getWaterways() {
    try {
      const url = `${this.apiBaseResources}/routes`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Waterways load error:', err);
      return [];
    }
  }

  async getAllData(language = 'de') {
    try {
      const [closures, waterways] = await Promise.all([
        this.getClosures(language),
        this.getWaterways()
      ]);
      return { closures, waterways };
    } catch (err) {
      console.error('Data load error:', err);
      return { closures: [], waterways: [] };
    }
  }

  async getLatLon() {
    try {
      const url = `${this.apiBase}/vessels/self/navigation/position`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.value && typeof data.value.latitude === 'number' && typeof data.value.longitude === 'number') {
        return { lat: data.value.latitude, lon: data.value.longitude };
      }
      if (data.values) {
        for (const source of Object.values(data.values)) {
          const val = source.value || {};
          if (typeof val.latitude === 'number' && typeof val.longitude === 'number') {
            return { lat: val.latitude, lon: val.longitude };
          }
        }
      }
      return null;
    } catch (err) {
      console.error('Lat/Lon load error:', err);
      return null;
    }
  }

  async getVesselData() {
  try {
    const url = `${this.apiBase}/vessels/self/`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    return {
      name: data.name || null,
      mmsi: data.mmsi || null,
      communication: data.communication || null,
      design: data.design || null
    };
  } catch (err) {
    console.error('Vessel data load error:', err);
    return null;
  }
  }
  
}