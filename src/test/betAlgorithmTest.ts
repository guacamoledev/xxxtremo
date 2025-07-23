import { Timestamp } from 'firebase/firestore';
import type { Bet } from '../types';

// Función para testear el nuevo algoritmo con múltiples matches
export async function testMultipleMatchingAlgorithm() {
  console.log('🧪 ===== TESTING MULTIPLE MATCHING ALGORITHM =====');
  
  // Simular el caso: 2 rojas $100 + 1 verde $500
  const mockFightId = 'test_fight_123';
  
  const mockBets: Bet[] = [
    // Primera apuesta roja $100
    {
      id: 'red_bet_1',
      userId: 'user_1',
      fightId: mockFightId,
      color: 'red',
      amount: 100,
      originalAmount: 100,
      status: 'pending',
      creationDate: Timestamp.now(),
      matches: [],
      isResidual: false,
    },
    // Segunda apuesta roja $100
    {
      id: 'red_bet_2',
      userId: 'user_2',
      fightId: mockFightId,
      color: 'red',
      amount: 100,
      originalAmount: 100,
      status: 'pending',
      creationDate: Timestamp.now(),
      matches: [],
      isResidual: false,
    },
    // Apuesta verde $500
    {
      id: 'green_bet_1',
      userId: 'user_3',
      fightId: mockFightId,
      color: 'green',
      amount: 500,
      originalAmount: 500,
      status: 'pending',
      creationDate: Timestamp.now(),
      matches: [],
      isResidual: false,
    }
  ];

  console.log('📋 Mock bets created:');
  mockBets.forEach(bet => {
    console.log(`   ${bet.color.toUpperCase()} $${bet.amount} (User: ${bet.userId})`);
  });
  
  // Simular el algoritmo de emparejamiento múltiple
  console.log('\n🔍 Testing multiple matching algorithm...');
  
  // Separar por color y ordenar
  const redBets = mockBets
    .filter(b => b.color === 'red')
    .sort((a, b) => a.amount - b.amount);
  
  const greenBets = mockBets
    .filter(b => b.color === 'green')
    .sort((a, b) => a.amount - b.amount);

  console.log('\n📊 Separated bets:');
  console.log(`🔴 Red bets: ${redBets.map(b => `$${b.amount}`).join(', ')}`);
  console.log(`🟢 Green bets: ${greenBets.map(b => `$${b.amount}`).join(', ')}`);

  // Simular el algoritmo findMultipleMatches
  interface AvailableBet extends Bet {
    availableAmount: number;
  }

  const availableReds: AvailableBet[] = redBets.map(bet => ({ ...bet, availableAmount: bet.amount }));
  const availableGreens: AvailableBet[] = greenBets.map(bet => ({ ...bet, availableAmount: bet.amount }));

  const matches: Array<{
    redBet: Bet;
    greenBet: Bet;
    matchedAmount: number;
    redResidual: number;
    greenResidual: number;
  }> = [];

  console.log('\n🎯 Finding multiple matches...');
  console.log(`🔴 Available reds: ${availableReds.map(b => `$${b.amount}`).join(', ')}`);
  console.log(`🟢 Available greens: ${availableGreens.map(b => `$${b.amount}`).join(', ')}`);

  // Paso 1: Matches exactos
  console.log('\n📍 Step 1: Perfect matches');
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

        console.log(`✅ Perfect match: Red $${redBet.amount} vs Green $${greenBet.amount}`);
        redBet.availableAmount = 0;
        greenBet.availableAmount = 0;
        break;
      }
    }
  }

  // Paso 2: Múltiples rojas contra verdes grandes
  console.log('\n📍 Step 2: Multiple reds vs large greens');
  for (const greenBet of availableGreens) {
    if (greenBet.availableAmount <= 0) continue;

    console.log(`🎯 Processing Green $${greenBet.amount} (available: $${greenBet.availableAmount})`);

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

      console.log(`🔗 Match: Red $${redBet.amount} vs Green $${greenBet.amount} → $${matchAmount}`);
      console.log(`   Red remaining: $${redBet.availableAmount}, Green remaining: $${greenBet.availableAmount}`);
    }
  }

  // Calcular residuales finales
  console.log('\n📍 Step 3: Calculate final residuals');
  const residualMap = new Map<string, number>();
  
  [...availableReds, ...availableGreens].forEach(bet => {
    if (bet.availableAmount > 0) {
      residualMap.set(bet.id, bet.availableAmount);
      console.log(`💰 Residual for ${bet.color} $${bet.amount}: $${bet.availableAmount}`);
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

  // Mostrar resultados
  console.log('\n📈 FINAL RESULTS:');
  console.log(`🤝 Total matches: ${matches.length}`);
  
  matches.forEach((match, index) => {
    console.log(`\n   Match ${index + 1}:`);
    console.log(`   🔴 Red: $${match.redBet.amount} (User: ${match.redBet.userId})`);
    console.log(`   🟢 Green: $${match.greenBet.amount} (User: ${match.greenBet.userId})`);
    console.log(`   💰 Matched amount: $${match.matchedAmount}`);
    if (match.redResidual > 0) {
      console.log(`   🔄 Red residual refund: $${match.redResidual}`);
    }
    if (match.greenResidual > 0) {
      console.log(`   🔄 Green residual refund: $${match.greenResidual}`);
    }
  });

  // Verificar que todas las apuestas fueron procesadas
  const allProcessed = [...availableReds, ...availableGreens].every(bet => bet.availableAmount === 0);
  
  console.log(`\n${allProcessed ? '✅' : '❌'} All bets processed: ${allProcessed}`);
  
  if (!allProcessed) {
    console.log('\n⚠️ Unprocessed amounts:');
    [...availableReds, ...availableGreens].forEach(bet => {
      if (bet.availableAmount > 0) {
        console.log(`   ${bet.color.toUpperCase()} $${bet.amount}: $${bet.availableAmount} remaining`);
      }
    });
  }

  // Resumen de resultados esperados
  console.log('\n🎉 EXPECTED RESULTS FOR CASE: 2 Red $100 + 1 Green $500');
  console.log('✅ Green $500 should have 2 matches of $100 each');
  console.log('✅ Red $100 (User 1) should be fully matched');
  console.log('✅ Red $100 (User 2) should be fully matched');
  console.log('✅ Green user should receive $300 refund (residual)');
  console.log('✅ No bets should be completely refunded');

  console.log('\n🎉 Test completed!');
  console.log('==========================================');
}

// Para ejecutar en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).testMultipleMatchingAlgorithm = testMultipleMatchingAlgorithm;
}
