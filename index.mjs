import { readFileSync } from 'node:fs';
import { argv } from 'node:process';
import {
  calculateCommissions,
  getCommissionFeeCalculator,
} from './commission-fee-calculator.mjs';

const config = {
  cashInConfig: { commissionFee: 0.0003, maxFee: 5.0 },
  cashOutNaturalConfig: { commissionFee: 0.003, weeklyFreeLimit: 1000.0 },
  cashOutJuridicalConfig: { commissionFee: 0.003, minFee: 0.5 },
};

const filePath = argv[2];

const operations = JSON.parse(readFileSync(filePath, 'utf-8'));

calculateCommissions(operations, config, getCommissionFeeCalculator).forEach(
  fee => console.log(fee)
);
