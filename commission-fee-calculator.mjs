import { isSameISOWeek } from 'date-fns';

export function getCommissionFeeCalculator(config) {
  let weeklyTotals = {};
  let lastOperationDate = new Date('0000-01-01');
  return function (operation) {
    let feeableAmount = operation.operation.amount;
    let commissionFee = 0;
    if (config.weeklyFreeLimit) {
      if (!isSameISOWeek(lastOperationDate, new Date(operation.date))) {
        weeklyTotals = {};
        lastOperationDate = new Date(operation.date);
      }
      feeableAmount = Math.max(
        operation.operation.amount -
          Math.max(
            config.weeklyFreeLimit - (weeklyTotals[operation.user_id] || 0),
            0
          ),
        0
      );
      weeklyTotals[operation.user_id] =
        (weeklyTotals[operation.user_id] || 0) + operation.operation.amount;
    }
    if (config.commissionFee) {
      commissionFee = feeableAmount * config.commissionFee;
    }
    if (config.maxFee) {
      commissionFee = Math.min(commissionFee, config.maxFee);
    }
    if (config.minFee) {
      commissionFee = Math.max(commissionFee, config.minFee);
    }
    return Math.ceil(commissionFee * 100) / 100;
  };
}

export function calculateCommissions(operations, config, calculatorCreator) {
  const cashInCommissionFeeCalculator = calculatorCreator(
    config.cashInConfig
  );
  const cashOutNaturalCommissionCalculator = calculatorCreator(
    config.cashOutNaturalConfig
  );
  const cashOutJuridicalCommissionCalculator = calculatorCreator(
    config.cashOutJuridicalConfig
  );

  const result = [];
  for (const operation of operations) {
    if (operation.type === 'cash_in') {
      result.push(cashInCommissionFeeCalculator(operation).toFixed(2));
    } else if (
      operation.type === 'cash_out' &&
      operation.user_type === 'natural'
    ) {
      result.push(cashOutNaturalCommissionCalculator(operation).toFixed(2));
    } else if (
      operation.type === 'cash_out' &&
      operation.user_type === 'juridical'
    ) {
      result.push(cashOutJuridicalCommissionCalculator(operation).toFixed(2));
    }
  }
  return result;
}