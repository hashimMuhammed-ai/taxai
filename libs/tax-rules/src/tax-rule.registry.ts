import { Injectable } from '@nestjs/common';
import { ITaxRulePlugin } from './interfaces/tax-rule-plugin.interface';
import { TaxRegime } from '@taxai/shared';
import { FY2024_25_OldRegimePlugin } from './plugins/fy2024-25-old-regime.plugin';
import { FY2024_25_NewRegimePlugin } from './plugins/fy2024-25-new-regime.plugin';

// Adding a new financial year = add two plugin classes + two entries here
const PLUGIN_REGISTRY: ITaxRulePlugin[] = [
  new FY2024_25_OldRegimePlugin(),
  new FY2024_25_NewRegimePlugin(),
];

@Injectable()
export class TaxRuleRegistry {
  private readonly registry = new Map<string, ITaxRulePlugin>();

  constructor() {
    for (const plugin of PLUGIN_REGISTRY) {
      const key = this.buildKey(plugin.assessmentYear, plugin.regime);
      this.registry.set(key, plugin);
    }
  }

  resolve(assessmentYear: string, regime: TaxRegime): ITaxRulePlugin {
    const key = this.buildKey(assessmentYear, regime);
    const plugin = this.registry.get(key);

    if (!plugin) {
      throw new Error(
        `No tax rule plugin found for AY ${assessmentYear}, regime: ${regime}. ` +
        `Available: ${[...this.registry.keys()].join(', ')}`,
      );
    }

    return plugin;
  }

  getAvailableYears(): string[] {
    return [...new Set([...this.registry.values()].map((p) => p.assessmentYear))];
  }

  private buildKey(assessmentYear: string, regime: TaxRegime): string {
    return `${assessmentYear}:${regime}`;
  }
}