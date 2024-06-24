import { describe, it, expect, test } from 'vitest';
import {
  calculateCommissions,
  getCommissionFeeCalculator,
} from './commission-fee-calculator.mjs';

describe('general commission fee calculator', () => {
  it('should apply commission fee', () => {
    const calculator = getCommissionFeeCalculator({
      commissionFee: 0.0003,
      maxFee: 5.0,
    });

    const result = calculator({
      date: '2016-01-05',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_in',
      operation: { amount: 100.0, currency: 'EUR' },
    });

    expect(result).toBe(0.03);
  });

  it('should apply maximum fee', () => {
    const calculator = getCommissionFeeCalculator({
      commissionFee: 0.0003,
      maxFee: 5.0,
    });

    const result = calculator({
      date: '2016-01-05',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_in',
      operation: { amount: 30000.0, currency: 'EUR' },
    });

    expect(result).toBe(5);
  });

  it('should apply minimum fee', () => {
    const calculator = getCommissionFeeCalculator({
      commissionFee: 0.003,
      minFee: 0.5,
    });

    const result = calculator({
      date: '2016-01-05',
      user_id: 1,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 100, currency: 'EUR' },
    });

    expect(result).toBe(0.5);
  });

  it('should round result up to the nearest hundredth', () => {
    const calculator = getCommissionFeeCalculator({
      commissionFee: 0.0003,
      maxFee: 5.0,
    });

    const result = calculator({
      date: '2016-01-05',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_in',
      operation: { amount: 380.0, currency: 'EUR' },
    });

    expect(result).toBe(0.12);
  });

  it("should not apply fees if operation's amount has not exceeded free limit of current week", () => {
    const calculator = getCommissionFeeCalculator({
      commissionFee: 0.0003,
      weeklyFreeLimit: 1000,
    });

    const week1Result1 = calculator({
      date: '2024-06-03',
      user_id: 1,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 380.0, currency: 'EUR' },
    });

    const week1Result2 = calculator({
      date: '2024-06-09',
      user_id: 1,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 620.0, currency: 'EUR' },
    });

    const week2Result1 = calculator({
      date: '2024-06-10',
      user_id: 1,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 1000, currency: 'EUR' },
    });

    expect(week1Result1).toBe(0);
    expect(week1Result2).toBe(0);
    expect(week2Result1).toBe(0);
  });

  it("should apply fee only to the exceeding weekly limit part of operation's amount", () => {
    const calculator = getCommissionFeeCalculator({
      commissionFee: 0.0003,
      weeklyFreeLimit: 1000,
    });

    const week1Result1 = calculator({
      date: '2024-06-03',
      user_id: 1,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 380.0, currency: 'EUR' },
    });

    const week1Result2 = calculator({
      date: '2024-06-09',
      user_id: 1,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 720.0, currency: 'EUR' },
    });

    expect(week1Result1).toBe(0);
    expect(week1Result2).toBe(0.03);
  });
});

test('calculateCommissions should create and use separate calculator for each type of operation', () => {
  const config = {
    cashInConfig: { commissionFee: 0.0003, maxFee: 5.0 },
    cashOutNaturalConfig: { commissionFee: 0.003, weeklyFreeLimit: 1000.0 },
    cashOutJuridicalConfig: { commissionFee: 0.003, minFee: 0.5 },
  };
  const operations = [
    {
      date: '2016-01-05',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_in',
      operation: { amount: 200.0, currency: 'EUR' },
    },
    {
      date: '2016-01-06',
      user_id: 2,
      user_type: 'juridical',
      type: 'cash_out',
      operation: { amount: 300.0, currency: 'EUR' },
    },
    {
      date: '2016-01-06',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_out',
      operation: { amount: 30000, currency: 'EUR' },
    },
    {
      date: '2016-01-07',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_out',
      operation: { amount: 1000.0, currency: 'EUR' },
    },
    {
      date: '2016-01-07',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_out',
      operation: { amount: 100.0, currency: 'EUR' },
    },
    {
      date: '2016-01-10',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_out',
      operation: { amount: 100.0, currency: 'EUR' },
    },
    {
      date: '2016-01-10',
      user_id: 2,
      user_type: 'juridical',
      type: 'cash_in',
      operation: { amount: 1000000.0, currency: 'EUR' },
    },
    {
      date: '2016-01-10',
      user_id: 3,
      user_type: 'natural',
      type: 'cash_out',
      operation: { amount: 1000.0, currency: 'EUR' },
    },
    {
      date: '2016-02-15',
      user_id: 1,
      user_type: 'natural',
      type: 'cash_out',
      operation: { amount: 300.0, currency: 'EUR' },
    },
  ];

  const cashInCommissionFeeCalculator = () => 1; // cash in
  const cashOutNaturalCommissionCalculator = () => 2; // cash out for natural persons 
  const cashOutJuridicalCommissionCalculator = () => 3; // cash out for jurirdical persons

  const calculatorCreator = c => {
    if (c === config.cashInConfig) return cashInCommissionFeeCalculator;
    if (c === config.cashOutNaturalConfig)
      return cashOutNaturalCommissionCalculator;
    if (c === config.cashOutJuridicalConfig)
      return cashOutJuridicalCommissionCalculator;
  };

  const result = calculateCommissions(operations, config, calculatorCreator);

  const expected = [
    '1.00', // Cash in for user 1
    '3.00', // Cash out for juridical user 2
    '2.00', // Cash out for natural user 1
    '2.00', // Cash out for natural user 1 within weekly limit
    '2.00', // Cash out for natural user 1 exceeding weekly limit
    '2.00', // Cash out for natural user 1
    '1.00', 
    '2.00',
    '2.00',
  ];

  expect(result).toEqual(expected);
});
