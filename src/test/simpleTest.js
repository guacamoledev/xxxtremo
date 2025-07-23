// Suite de pruebas simplificada para el algoritmo de emparejamiento múltiple

// Simular el algoritmo findMultipleMatching
function simulateMultipleMatching(redAmounts, greenAmounts) {
  const details = [];
  const matches = [];

  // Crear estructura de apuestas disponibles
  const availableReds = redAmounts.map((amount, i) => ({
    id: `red_${i}`,
    amount,
    availableAmount: amount,
    color: 'red'
  }));

  const availableGreens = greenAmounts.map((amount, i) => ({
    id: `green_${i}`,
    amount,
    availableAmount: amount,
    color: 'green'
  }));

  details.push(`🔴 Red bets: ${redAmounts.map(a => `$${a}`).join(', ')}`);
  details.push(`🟢 Green bets: ${greenAmounts.map(a => `$${a}`).join(', ')}`);

  // Paso 1: Matches exactos
  details.push('\n📍 Step 1: Perfect matches');
  for (const redBet of availableReds) {
    if (redBet.availableAmount <= 0) continue;

    for (const greenBet of availableGreens) {
      if (greenBet.availableAmount <= 0) continue;

      if (redBet.availableAmount === greenBet.availableAmount) {
        matches.push({
          redBet,
          greenBet,
          matchedAmount: redBet.availableAmount,
          redResidual: 0,
          greenResidual: 0
        });

        details.push(`✅ Perfect match: Red $${redBet.amount} vs Green $${greenBet.amount}`);
        redBet.availableAmount = 0;
        greenBet.availableAmount = 0;
        break;
      }
    }
  }

  // Paso 2: Múltiples rojas contra verdes grandes
  details.push('\n📍 Step 2: Multiple reds vs large greens');
  for (const greenBet of availableGreens) {
    if (greenBet.availableAmount <= 0) continue;

    details.push(`🎯 Processing Green $${greenBet.amount} (available: $${greenBet.availableAmount})`);

    for (const redBet of availableReds) {
      if (redBet.availableAmount <= 0) continue;
      if (greenBet.availableAmount <= 0) break;

      const matchAmount = Math.min(redBet.availableAmount, greenBet.availableAmount);
      
      matches.push({
        redBet,
        greenBet,
        matchedAmount: matchAmount,
        redResidual: 0,
        greenResidual: 0
      });

      redBet.availableAmount -= matchAmount;
      greenBet.availableAmount -= matchAmount;

      details.push(`🔗 Match: Red $${redBet.amount} vs Green $${greenBet.amount} → $${matchAmount}`);
    }
  }

  // Paso 3: Múltiples verdes contra rojas grandes
  details.push('\n📍 Step 3: Multiple greens vs large reds');
  for (const redBet of availableReds) {
    if (redBet.availableAmount <= 0) continue;

    details.push(`🎯 Processing Red $${redBet.amount} (available: $${redBet.availableAmount})`);

    for (const greenBet of availableGreens) {
      if (greenBet.availableAmount <= 0) continue;
      if (redBet.availableAmount <= 0) break;

      const matchAmount = Math.min(redBet.availableAmount, greenBet.availableAmount);
      
      matches.push({
        redBet,
        greenBet,
        matchedAmount: matchAmount,
        redResidual: 0,
        greenResidual: 0
      });

      redBet.availableAmount -= matchAmount;
      greenBet.availableAmount -= matchAmount;

      details.push(`🔗 Match: Red $${redBet.amount} vs Green $${greenBet.amount} → $${matchAmount}`);
    }
  }

  // Calcular residuales finales
  details.push('\n📍 Step 4: Calculate final residuals');
  const residualMap = new Map();
  
  [...availableReds, ...availableGreens].forEach(bet => {
    if (bet.availableAmount > 0) {
      residualMap.set(bet.id, bet.availableAmount);
      details.push(`💰 Residual for ${bet.color} $${bet.amount}: $${bet.availableAmount}`);
    }
  });

  // Asignar residuales al último match de cada apuesta
  const betLastMatch = new Map();
  matches.forEach(match => {
    betLastMatch.set(match.redBet.id, match);
    betLastMatch.set(match.greenBet.id, match);
  });

  matches.forEach(match => {
    const redResidual = residualMap.get(match.redBet.id) || 0;
    const greenResidual = residualMap.get(match.greenBet.id) || 0;
    
    if (betLastMatch.get(match.redBet.id) === match) {
      match.redResidual = redResidual;
    }
    
    if (betLastMatch.get(match.greenBet.id) === match) {
      match.greenResidual = greenResidual;
    }
  });

  return { matches, details };
}

// Ejecutar una prueba individual
function runTestCase(name, redAmounts, greenAmounts) {
  console.log(`\n🧪 ===== TEST CASE: ${name} =====`);
  
  // Ordenar por monto (como en el algoritmo real)
  redAmounts.sort((a, b) => a - b);
  greenAmounts.sort((a, b) => a - b);

  // Ejecutar algoritmo
  const { matches, details } = simulateMultipleMatching(redAmounts, greenAmounts);

  // Mostrar detalles
  details.forEach(detail => console.log(`   ${detail}`));

  // Mostrar resultados
  console.log('\n📈 RESULTS:');
  console.log(`🤝 Total matches: ${matches.length}`);
  
  matches.forEach((match, index) => {
    console.log(`\n   Match ${index + 1}:`);
    console.log(`   🔴 Red: $${match.redBet.amount} (${match.redBet.id})`);
    console.log(`   🟢 Green: $${match.greenBet.amount} (${match.greenBet.id})`);
    console.log(`   💰 Matched: $${match.matchedAmount}`);
    if (match.redResidual > 0) {
      console.log(`   🔄 Red residual: $${match.redResidual}`);
    }
    if (match.greenResidual > 0) {
      console.log(`   🔄 Green residual: $${match.greenResidual}`);
    }
  });

  // Verificar balances
  const totalRedBet = redAmounts.reduce((sum, amount) => sum + amount, 0);
  const totalGreenBet = greenAmounts.reduce((sum, amount) => sum + amount, 0);
  const totalMatched = matches.reduce((sum, match) => sum + match.matchedAmount, 0);
  const totalResiduals = matches.reduce((sum, match) => sum + match.redResidual + match.greenResidual, 0);

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Red Bet: $${totalRedBet}`);
  console.log(`   Total Green Bet: $${totalGreenBet}`);
  console.log(`   Total Matched: $${totalMatched}`);
  console.log(`   Total Residuals: $${totalResiduals}`);
  console.log(`   Efficiency: ${((totalMatched / Math.max(totalRedBet, totalGreenBet)) * 100).toFixed(1)}%`);

  // Verificar integridad
  const expectedResiduals = Math.abs(totalRedBet - totalGreenBet);
  const actualResiduals = totalResiduals;
  const integrity = expectedResiduals === actualResiduals;
  
  console.log(`   ${integrity ? '✅' : '❌'} Integrity check: ${integrity ? 'PASSED' : 'FAILED'}`);
  if (!integrity) {
    console.log(`   Expected residuals: $${expectedResiduals}, Actual: $${actualResiduals}`);
  }

  console.log('==========================================');
}

// Ejecutar casos de prueba
console.log('🚀 STARTING BETTING ALGORITHM TEST SUITE');
console.log('Testing multiple matching algorithm with various scenarios\n');

// Caso 1: El caso original - 2 rojas $100 + 1 verde $500
runTestCase(
  'Original Case - 2 Red $100 + 1 Green $500',
  [100, 100],
  [500]
);

// Caso 2: Matches perfectos
runTestCase(
  'Perfect Matches - Same Amounts',
  [100, 200, 300],
  [100, 200, 300]
);

// Caso 3: Una roja grande vs múltiples verdes pequeñas
runTestCase(
  'Large Red vs Multiple Small Greens',
  [1000],
  [100, 200, 300, 400]
);

// Caso 4: Múltiples rojas vs múltiples verdes (cantidades variadas)
runTestCase(
  'Mixed Amounts - Complex Scenario',
  [150, 250, 100, 300],
  [200, 400, 100, 50]
);

// Caso 5: Cantidades muy dispares
runTestCase(
  'Very Different Amounts',
  [50, 75],
  [1000]
);

// Caso 6: Muchas apuestas pequeñas vs pocas grandes
runTestCase(
  'Many Small vs Few Large',
  [100, 100, 100, 100, 100],
  [250, 250]
);

console.log('\n🎉 ALL TESTS COMPLETED!');
console.log('Review the results above to ensure the algorithm works correctly in all scenarios.');
