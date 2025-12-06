class VaarweginformatieApiBridge {
  constructor() {
    this.configUrl = '/plugins/signalk-vaarweginformatie-blocked/config';
    this.restartUrl = '/plugins/signalk-vaarweginformatie-blocked/restart';
    this.apiBase = `http://${window.location.hostname}:${window.location.port || '3000'}/signalk/v2/api/resources`;
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
      const url = `${this.apiBase}/${resourceType}`;
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
      const url = `${this.apiBase}/routes`;
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
}