class TrafficConfigStore {
  private config: { [k: string]: unknown } = {};

  getConfig({ configKey }: { configKey?: string } = {}) {
    if (configKey) {
      return this.config?.[configKey];
    }
    return this.config;
  }

  updateConfig({ configKey, configValue }: { configKey?: string; configValue?: { [k: string]: unknown } }) {
    if (configKey) {
      this.config[configKey] = configValue;
    } else {
      this.config = configValue ?? {};
    }
  }
}

const trafficConfigStore = new TrafficConfigStore();

export { trafficConfigStore };
