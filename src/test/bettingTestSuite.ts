import { Timestamp } from 'firebase/firestore';
import type { Bet } from '../types';

// Suite de pruebas para el algoritmo de emparejamiento múltiple
export class BettingAlgorithmTestSuite {
  
  // Simular el algoritmo findMultipleMatches
  private simulateMultipleMatching(redBets: Bet[], greenBets: Bet[]): {
    matches: Array<{
      redBet: Bet;
      greenBet: Bet;
      matchedAmount: number;
      redResidual: number;
      greenResidual: number;
    }>;
    details: string[];
  } {
    const details: string[] = [];
    const matches: Array<{
      redBet: Bet;
      greenBet: Bet;
      matchedAmount: number;
      redResidual: number;
      greenResidual: number;
    }> = [];

    interface AvailableBet extends Bet {
      availableAmount: number;
    }

    const availableReds: AvailableBet[] = redBets.map(bet => ({ ...bet, availableAmount: bet.amount }));
    const availableGreens: AvailableBet[] = greenBets.map(bet => ({ ...bet, availableAmount: bet.amount }));

    details.push(`🔴 Red bets: ${redBets.map(b => `$${b.amount}`).join(', ')}`);
    details.push(`🟢 Green bets: ${greenBets.map(b => `$${b.amount}`).join(', ')}`);

    // Paso 1: Matches exactos
    details.push('\n📍 Step 1: Perfect matches');
    for (const redBet of availableReds) {
      if (redBet.availableAmount <= 0) continue;

      for (const greenBet of availableGreens) {
        if (greenBet.availableAmount <= 0) continue;

        if (redBet.availableAmount === greenBet.availableAmount) {
          matches.push({
            redBet: redBet as Bet,
            greenBet: greenBet as Bet,
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
          redBet: redBet as Bet,
          greenBet: greenBet as Bet,
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
          redBet: redBet as Bet,
          greenBet: greenBet as Bet,
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
    const residualMap = new Map<string, number>();
    
    [...availableReds, ...availableGreens].forEach(bet => {
      if (bet.availableAmount > 0) {
        residualMap.set(bet.id, bet.availableAmount);
        details.push(`💰 Residual for ${bet.color} $${bet.amount}: $${bet.availableAmount}`);
      }
    });

    // Asignar residuales al último match de cada apuesta
    const betLastMatch = new Map<string, any>();
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

  // Crear apuesta mock
  private createMockBet(id: string, userId: string, color: 'red' | 'green', amount: number): Bet {
    return {
      id,
      userId,
      fightId: 'test_fight',
      color,
      amount,
      originalAmount: amount,
      status: 'pending',
      creationDate: Timestamp.now(),
      matches: [],
      isResidual: false,
    };
  }

  // Ejecutar una prueba individual
  private runTestCase(name: string, redAmounts: number[], greenAmounts: number[]): void {
    console.log(`\n🧪 ===== TEST CASE: ${name} =====`);
    
    // Crear apuestas mock
    const redBets = redAmounts.map((amount, i) => 
      this.createMockBet(`red_${i}`, `user_red_${i}`, 'red', amount)
    );
    const greenBets = greenAmounts.map((amount, i) => 
      this.createMockBet(`green_${i}`, `user_green_${i}`, 'green', amount)
    );

    // Ordenar por monto (como en el algoritmo real)
    redBets.sort((a, b) => a.amount - b.amount);
    greenBets.sort((a, b) => a.amount - b.amount);

    // Ejecutar algoritmo
    const { matches, details } = this.simulateMultipleMatching(redBets, greenBets);

    // Mostrar detalles
    details.forEach(detail => console.log(`   ${detail}`));

    // Mostrar resultados
    console.log('\n📈 RESULTS:');
    console.log(`🤝 Total matches: ${matches.length}`);
    
    matches.forEach((match, index) => {
      console.log(`\n   Match ${index + 1}:`);
      console.log(`   🔴 Red: $${match.redBet.amount} (${match.redBet.userId})`);
      console.log(`   🟢 Green: $${match.greenBet.amount} (${match.greenBet.userId})`);
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

  // Ejecutar todos los casos de prueba
  public runAllTests(): void {
    console.log('🚀 STARTING BETTING ALGORITHM TEST SUITE');
    console.log('Testing multiple matching algorithm with various scenarios\n');

    // Caso 1: El caso original - 2 rojas $100 + 1 verde $500
    this.runTestCase(
      'Original Case - 2 Red $100 + 1 Green $500',
      [100, 100],
      [500]
    );

    // Caso 2: Matches perfectos
    this.runTestCase(
      'Perfect Matches - Same Amounts',
      [100, 200, 300],
      [100, 200, 300]
    );

    // Caso 3: Una roja grande vs múltiples verdes pequeñas
    this.runTestCase(
      'Large Red vs Multiple Small Greens',
      [1000],
      [100, 200, 300, 400]
    );

    // Caso 4: Múltiples rojas vs múltiples verdes (cantidades variadas)
    this.runTestCase(
      'Mixed Amounts - Complex Scenario',
      [150, 250, 100, 300],
      [200, 400, 100, 50]
    );

    // Caso 5: Solo rojas (debería resultar en reembolsos completos)
    this.runTestCase(
      'Only Red Bets - Should Refund All',
      [100, 200, 300],
      []
    );

    // Caso 6: Solo verdes (debería resultar en reembolsos completos)
    this.runTestCase(
      'Only Green Bets - Should Refund All',
      [],
      [100, 200, 300]
    );

    // Caso 7: Cantidades muy dispares
    this.runTestCase(
      'Very Different Amounts',
      [50, 75],
      [1000]
    );

    // Caso 8: Muchas apuestas pequeñas vs pocas grandes
    this.runTestCase(
      'Many Small vs Few Large',
      [100, 100, 100, 100, 100],
      [250, 250]
    );

    // Caso 9: Escenario balanceado
    this.runTestCase(
      'Balanced Scenario',
      [200, 300, 500],
      [300, 400, 300]
    );

    // Caso 10: Apuestas idénticas múltiples
    this.runTestCase(
      'Multiple Identical Bets',
      [100, 100, 100],
      [100, 100, 100]
    );

    console.log('\n🎉 ALL TESTS COMPLETED!');
    console.log('Review the results above to ensure the algorithm works correctly in all scenarios.');
  }
}

// Función para ejecutar las pruebas
export function runBettingAlgorithmTests(): void {
  const testSuite = new BettingAlgorithmTestSuite();
  testSuite.runAllTests();
}

// Para ejecutar en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).runBettingAlgorithmTests = runBettingAlgorithmTests;
}
