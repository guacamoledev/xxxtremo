import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Bet, Fight, User } from '../types';

// Configuración del sistema de emparejamiento
export const MATCHING_CONFIG = {
  ENABLE_DETAILED_LOGS: true,
  MAX_PROCESSING_TIME: 30000, // 30 segundos
  PROFIT_RATE: 0.90, // 90% de ganancia sobre el monto apostado
  COMMISSION_RATE: 0.10, // 10% comisión de la plataforma (legacy - ya no se usa en cálculo)
} as const;

// Interfaces para el algoritmo de emparejamiento
interface BetMatch {
  betId: string;
  amount: number;
  matchedAt: Timestamp;
}

interface MatchResult {
  redBet: Bet;
  greenBet: Bet;
  matchedAmount: number;
  redResidual: number;
  greenResidual: number;
}

interface MatchingLog {
  timestamp: Timestamp;
  fightId: string;
  totalBets: number;
  redBets: number;
  greenBets: number;
  totalMatches: number;
  totalRefunded: number;
  processingTime: number;
  details: string[];
}

// Bet temporal para algoritmo con monto disponible
interface AvailableBet extends Bet {
  availableAmount: number;
}

class BetService {
  private collection = collection(db, 'bets');

  // ===============================
  // OPERACIONES BÁSICAS (CRUD)
  // ===============================

  async create(bet: Omit<Bet, 'id'>): Promise<string> {
    const docRef = await addDoc(this.collection, bet);
    return docRef.id;
  }

  async getAll(): Promise<Bet[]> {
    const snapshot = await getDocs(this.collection);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Bet));
  }

  async getByFight(fightId: string): Promise<Bet[]> {
    const q = query(
      this.collection,
      where('fightId', '==', fightId),
      orderBy('creationDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Bet));
  }

  async getByUser(userId: string): Promise<Bet[]> {
    const q = query(
      this.collection,
      where('userId', '==', userId),
      orderBy('creationDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Bet));
  }

  async update(id: string, data: Partial<Bet>): Promise<void> {
    const docRef = doc(this.collection, id);
    await updateDoc(docRef, data);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.collection, id);
    await deleteDoc(docRef);
  }

  // ===============================
  // LÓGICA DE APUESTAS
  // ===============================

  // Realizar una apuesta
  async placeBet(userId: string, fightId: string, color: 'red' | 'green', amount: number): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // Leer usuario
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado');
      }
      
      const user = userDoc.data() as User;
      
      if (user.balance < amount) {
        throw new Error('Saldo insuficiente');
      }

      // Leer pelea
      const fightRef = doc(db, 'fights', fightId);
      const fightDoc = await transaction.get(fightRef);
      
      if (!fightDoc.exists()) {
        throw new Error('Pelea no encontrada');
      }
      
      const fight = fightDoc.data() as Fight;
      
      if (!fight.bettingEnabled || fight.status !== 'betting_open') {
        throw new Error('Las apuestas no están disponibles para esta pelea');
      }

      // Crear la apuesta
      const betRef = doc(collection(db, 'bets'));
      const bet: Omit<Bet, 'id'> = {
        userId,
        fightId,
        color,
        amount,
        originalAmount: amount,
        status: 'pending',
        creationDate: Timestamp.now(),
        matches: [],
        isResidual: false,
      };

      transaction.set(betRef, bet);

      // Actualizar balance del usuario
      transaction.update(userRef, {
        balance: user.balance - amount,
      });

      return betRef.id;
    });
  }

  // ===============================
  // ALGORITMO DE EMPAREJAMIENTO CON MÚLTIPLES MATCHES
  // ===============================

  // Emparejar automáticamente todas las apuestas pendientes
  async autoMatchBets(fightId: string): Promise<void> {
    const startTime = Date.now();
    
    const log: MatchingLog = {
      timestamp: Timestamp.now(),
      fightId,
      totalBets: 0,
      redBets: 0,
      greenBets: 0,
      totalMatches: 0,
      totalRefunded: 0,
      processingTime: 0,
      details: []
    };

    try {
      // Obtener todas las apuestas pendientes
      const allBets = await this.getByFight(fightId);
      const pendingBets = allBets.filter(bet => bet.status === 'pending');
      
      log.totalBets = pendingBets.length;
      log.redBets = pendingBets.filter(b => b.color === 'red').length;
      log.greenBets = pendingBets.filter(b => b.color === 'green').length;
      
      if (pendingBets.length === 0) {
        log.details.push('❌ No hay apuestas pendientes para emparejar');
        return;
      }

      log.details.push(`🎯 Iniciando emparejamiento: ${log.totalBets} apuestas (${log.redBets} rojas, ${log.greenBets} verdes)`);

      // Separar por color y ordenar por monto (ascendente para mejor matching)
      const redBets = pendingBets
        .filter(b => b.color === 'red')
        .sort((a, b) => a.amount - b.amount);
      
      const greenBets = pendingBets
        .filter(b => b.color === 'green')
        .sort((a, b) => a.amount - b.amount);

      if (redBets.length === 0 || greenBets.length === 0) {
        // No hay apuestas de ambos colores, reembolsar todas
        log.details.push('⚠️ Solo hay apuestas de un color, reembolsando todas');
        await this.refundAllBets(pendingBets, log);
        return;
      }

      // Realizar emparejamiento con múltiples matches
      const matches = this.findMultipleMatches(redBets, greenBets, log);
      
      if (matches.length > 0) {
        await this.executeMultipleMatches(matches, log);
        log.totalMatches = matches.length;
      }

      // Reembolsar apuestas no emparejadas
      const matchedBetIds = new Set(
        matches.flatMap(m => [m.redBet.id, m.greenBet.id])
      );
      
      const unmatchedBets = pendingBets.filter(bet => !matchedBetIds.has(bet.id));
      
      if (unmatchedBets.length > 0) {
        await this.refundAllBets(unmatchedBets, log);
        log.totalRefunded = unmatchedBets.length;
      }

      log.details.push(`✅ Emparejamiento completado: ${log.totalMatches} matches, ${log.totalRefunded} reembolsadas`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      log.details.push(`❌ Error en emparejamiento: ${errorMessage}`);
      console.error('❌ AutoMatchBets: Error during matching:', error);
      throw error;
    } finally {
      log.processingTime = Date.now() - startTime;
      this.logMatchingResult(log);
    }
  }

  // Encontrar emparejamientos con soporte para múltiples matches
  private findMultipleMatches(redBets: Bet[], greenBets: Bet[], log: MatchingLog): MatchResult[] {
    const matches: MatchResult[] = [];
    
    // Crear copias para manejar montos disponibles
    const availableReds: AvailableBet[] = redBets.map(bet => ({ ...bet, availableAmount: bet.amount }));
    const availableGreens: AvailableBet[] = greenBets.map(bet => ({ ...bet, availableAmount: bet.amount }));

    log.details.push('🔍 Buscando emparejamientos con múltiples matches...');
    log.details.push(`🔴 Rojas disponibles: ${availableReds.map(b => `$${b.amount}`).join(', ')}`);
    log.details.push(`🟢 Verdes disponibles: ${availableGreens.map(b => `$${b.amount}`).join(', ')}`);

    // ALGORITMO MEJORADO: Permitir múltiples matches por apuesta
    
    // Paso 1: Buscar matches exactos primero
    for (const redBet of availableReds) {
      if (redBet.availableAmount <= 0) continue;

      for (const greenBet of availableGreens) {
        if (greenBet.availableAmount <= 0) continue;

        if (redBet.availableAmount === greenBet.availableAmount) {
          // Match perfecto
          matches.push({
            redBet: redBet as Bet,
            greenBet: greenBet as Bet,
            matchedAmount: redBet.availableAmount,
            redResidual: 0,
            greenResidual: 0
          });

          log.details.push(`✅ Match perfecto: Roja $${redBet.amount} vs Verde $${greenBet.amount}`);
          
          // Marcar como completamente usados
          redBet.availableAmount = 0;
          greenBet.availableAmount = 0;
          break;
        }
      }
    }

    // Paso 2: Emparejar múltiples rojas pequeñas contra verdes grandes
    for (const greenBet of availableGreens) {
      if (greenBet.availableAmount <= 0) continue;

      log.details.push(`🎯 Procesando Verde $${greenBet.amount} (disponible: $${greenBet.availableAmount})`);

      for (const redBet of availableReds) {
        if (redBet.availableAmount <= 0) continue;
        if (greenBet.availableAmount <= 0) break;

        const matchAmount = Math.min(redBet.availableAmount, greenBet.availableAmount);
        
        matches.push({
          redBet: redBet as Bet,
          greenBet: greenBet as Bet,
          matchedAmount: matchAmount,
          redResidual: 0, // Se calculará después
          greenResidual: 0 // Se calculará después
        });

        // Actualizar montos disponibles
        redBet.availableAmount -= matchAmount;
        greenBet.availableAmount -= matchAmount;

        log.details.push(`🔗 Match: Roja $${redBet.amount} vs Verde $${greenBet.amount} → $${matchAmount} (R restante: $${redBet.availableAmount}, V restante: $${greenBet.availableAmount})`);
      }
    }

    // Paso 3: Emparejar múltiples verdes pequeñas contra rojas grandes restantes
    for (const redBet of availableReds) {
      if (redBet.availableAmount <= 0) continue;

      log.details.push(`🎯 Procesando Roja restante $${redBet.amount} (disponible: $${redBet.availableAmount})`);

      for (const greenBet of availableGreens) {
        if (greenBet.availableAmount <= 0) continue;
        if (redBet.availableAmount <= 0) break;

        const matchAmount = Math.min(redBet.availableAmount, greenBet.availableAmount);
        
        matches.push({
          redBet: redBet as Bet,
          greenBet: greenBet as Bet,
          matchedAmount: matchAmount,
          redResidual: 0, // Se calculará después
          greenResidual: 0 // Se calculará después
        });

        // Actualizar montos disponibles
        redBet.availableAmount -= matchAmount;
        greenBet.availableAmount -= matchAmount;

        log.details.push(`🔗 Match adicional: Roja $${redBet.amount} vs Verde $${greenBet.amount} → $${matchAmount}`);
      }
    }

    // Paso 4: Calcular residuales finales
    this.calculateFinalResiduals(matches, availableReds, availableGreens, log);

    return matches;
  }

  // Calcular residuales finales después de todos los matches
  private calculateFinalResiduals(
    matches: MatchResult[], 
    availableReds: AvailableBet[], 
    availableGreens: AvailableBet[], 
    log: MatchingLog
  ): void {
    // Usar availableAmount para determinar residuales
    const residualMap = new Map<string, number>();
    
    // Recopilar residuales de las apuestas disponibles
    [...availableReds, ...availableGreens].forEach(bet => {
      if (bet.availableAmount > 0) {
        residualMap.set(bet.id, bet.availableAmount);
      }
    });

    // Actualizar residuales en matches (solo el último match de cada apuesta lleva el residual)
    const betLastMatch = new Map<string, MatchResult>();
    
    // Encontrar el último match de cada apuesta
    matches.forEach(match => {
      betLastMatch.set(match.redBet.id, match);
      betLastMatch.set(match.greenBet.id, match);
    });

    // Asignar residuales solo al último match
    matches.forEach(match => {
      const redResidual = residualMap.get(match.redBet.id) || 0;
      const greenResidual = residualMap.get(match.greenBet.id) || 0;
      
      // Solo asignar residual si este es el último match de la apuesta
      if (betLastMatch.get(match.redBet.id) === match) {
        match.redResidual = redResidual;
        if (redResidual > 0) {
          log.details.push(`💰 Residual rojo final: $${redResidual} de apuesta $${match.redBet.amount}`);
        }
      }
      
      if (betLastMatch.get(match.greenBet.id) === match) {
        match.greenResidual = greenResidual;
        if (greenResidual > 0) {
          log.details.push(`💰 Residual verde final: $${greenResidual} de apuesta $${match.greenBet.amount}`);
        }
      }
    });
  }

  // Ejecutar los emparejamientos múltiples
  private async executeMultipleMatches(matches: MatchResult[], log: MatchingLog): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const matchTimestamp = Timestamp.now();
      const userReimbursements = new Map<string, number>();
      const betUpdates = new Map<string, { status: string; matches: BetMatch[]; amount: number }>();

      // FASE 1: LEER TODOS LOS USUARIOS PRIMERO
      const uniqueUserIds = [...new Set(
        matches.flatMap(m => [m.redBet.userId, m.greenBet.userId])
      )];

      const userReads = new Map<string, { ref: any, data: User }>();
      
      for (const userId of uniqueUserIds) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists()) {
          userReads.set(userId, {
            ref: userRef,
            data: userDoc.data() as User
          });
        }
      }

      // FASE 2: PROCESAR MATCHES Y ACUMULAR ACTUALIZACIONES
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const matchId = `match_${Date.now()}_${i}`;

        // Procesar apuesta roja
        const redBetId = match.redBet.id;
        const redMatch: BetMatch = {
          betId: matchId,
          amount: match.matchedAmount,
          matchedAt: matchTimestamp
        };

        // Acumular matches para apuesta roja
        if (!betUpdates.has(redBetId)) {
          betUpdates.set(redBetId, {
            status: 'matched',
            matches: [...(match.redBet.matches || [])],
            amount: 0
          });
        }
        const redUpdate = betUpdates.get(redBetId)!;
        redUpdate.matches.push(redMatch);
        redUpdate.amount += match.matchedAmount;

        // Procesar apuesta verde
        const greenBetId = match.greenBet.id;
        const greenMatch: BetMatch = {
          betId: matchId,
          amount: match.matchedAmount,
          matchedAt: matchTimestamp
        };

        // Acumular matches para apuesta verde
        if (!betUpdates.has(greenBetId)) {
          betUpdates.set(greenBetId, {
            status: 'matched',
            matches: [...(match.greenBet.matches || [])],
            amount: 0
          });
        }
        const greenUpdate = betUpdates.get(greenBetId)!;
        greenUpdate.matches.push(greenMatch);
        greenUpdate.amount += match.matchedAmount;

        // Acumular reembolsos de residuales
        if (match.redResidual > 0) {
          const currentReimbursement = userReimbursements.get(match.redBet.userId) || 0;
          userReimbursements.set(match.redBet.userId, currentReimbursement + match.redResidual);
          log.details.push(`💰 Reembolso rojo: $${match.redResidual} a usuario ${match.redBet.userId}`);
        }

        if (match.greenResidual > 0) {
          const currentReimbursement = userReimbursements.get(match.greenBet.userId) || 0;
          userReimbursements.set(match.greenBet.userId, currentReimbursement + match.greenResidual);
          log.details.push(`💰 Reembolso verde: $${match.greenResidual} a usuario ${match.greenBet.userId}`);
        }
      }

      // FASE 3: APLICAR TODAS LAS ACTUALIZACIONES DE APUESTAS
      for (const [betId, update] of betUpdates) {
        const betRef = doc(this.collection, betId);
        transaction.update(betRef, {
          status: update.status,
          matches: update.matches,
          matchedAmount: update.amount // Usar matchedAmount en lugar de amount
        });
      }

      // FASE 4: PROCESAR TODOS LOS REEMBOLSOS
      for (const [userId, reimbursementAmount] of userReimbursements) {
        const userInfo = userReads.get(userId);
        
        if (userInfo) {
          transaction.update(userInfo.ref, {
            balance: userInfo.data.balance + reimbursementAmount
          });
          log.details.push(`✅ Reembolso procesado: $${reimbursementAmount} a usuario ${userId}`);
        }
      }
    });
  }

  // Reembolsar apuestas
  private async refundAllBets(betsToRefund: Bet[], log: MatchingLog): Promise<void> {
    if (betsToRefund.length === 0) return;

    await runTransaction(db, async (transaction) => {
      // FASE 1: LEER TODOS LOS USUARIOS
      const uniqueUserIds = [...new Set(betsToRefund.map(bet => bet.userId))];
      const userReads = new Map<string, { ref: any, data: User }>();
      
      for (const userId of uniqueUserIds) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists()) {
          userReads.set(userId, {
            ref: userRef,
            data: userDoc.data() as User
          });
        }
      }

      // FASE 2: ACTUALIZAR APUESTAS Y BALANCES
      for (const bet of betsToRefund) {
        // Marcar apuesta como reembolsada
        const betRef = doc(this.collection, bet.id);
        transaction.update(betRef, {
          status: 'refunded'
        });

        // Devolver dinero al usuario
        const userInfo = userReads.get(bet.userId);
        if (userInfo) {
          transaction.update(userInfo.ref, {
            balance: userInfo.data.balance + bet.amount
          });
        }

        log.details.push(`🔄 Reembolsada: ${bet.color} $${bet.amount} a usuario ${bet.userId}`);
      }
    });
  }

  // ===============================
  // RESOLVER APUESTAS DESPUÉS DE PELEA
  // ===============================

  async resolveBets(fightId: string, winner: 'red' | 'green' | null): Promise<void> {
    const bets = await this.getByFight(fightId);
    const matchedBets = bets.filter(bet => bet.status === 'matched');
    
    await runTransaction(db, async (transaction) => {
      // FASE 1: LEER TODOS LOS USUARIOS
      const uniqueUserIds = [...new Set(matchedBets.map(bet => bet.userId))];
      const userReads = new Map<string, { ref: any, data: User }>();
      
      for (const userId of uniqueUserIds) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          userReads.set(userId, {
            ref: userRef,
            data: userDoc.data() as User
          });
        }
      }

      // FASE 2: RESOLVER APUESTAS
      // Acumular ganancias por usuario antes de actualizar balances
      const userWinnings = new Map<string, number>();
      
      for (const bet of matchedBets) {
        const betRef = doc(this.collection, bet.id);
        
        if (!winner) {
          // Empate - devolver dinero emparejado
          const matchedAmount = bet.matchedAmount || bet.amount;
          
          transaction.update(betRef, {
            status: 'refunded',
            profit: 0,
          });
          
          // Acumular reembolso
          const currentWinnings = userWinnings.get(bet.userId) || 0;
          userWinnings.set(bet.userId, currentWinnings + matchedAmount);
          
        } else if (bet.color === winner) {
          // Apuesta ganadora - ganancia fija del 90% sobre el monto emparejado
          const matchedAmount = bet.matchedAmount || bet.amount;
          const profit = matchedAmount * MATCHING_CONFIG.PROFIT_RATE;
          const netWin = matchedAmount + profit;
          
          transaction.update(betRef, {
            status: 'won',
            profit,
          });
          
          // Acumular ganancia
          const currentWinnings = userWinnings.get(bet.userId) || 0;
          userWinnings.set(bet.userId, currentWinnings + netWin);
          
        } else {
          // Apuesta perdedora
          transaction.update(betRef, {
            status: 'lost',
            profit: 0,
          });
        }
      }
      
      // FASE 3: ACTUALIZAR BALANCES DE USUARIOS (UNA SOLA VEZ POR USUARIO)
      for (const [userId, totalWinnings] of userWinnings) {
        const userInfo = userReads.get(userId);
        if (userInfo && totalWinnings > 0) {
          const newBalance = userInfo.data.balance + totalWinnings;
          
          transaction.update(userInfo.ref, {
            balance: newBalance,
          });
        }
      }
      
      // Marcar la pelea como resuelta
      const fightRef = doc(db, 'fights', fightId);
      transaction.update(fightRef, {
        resolved: true
      });
    });
  }

  // ===============================
  // FUNCIONES AUXILIARES
  // ===============================

  // Cancelar apuesta individual
  async cancelBet(betId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const betRef = doc(this.collection, betId);
      const betDoc = await transaction.get(betRef);
      
      if (!betDoc.exists()) {
        throw new Error('Apuesta no encontrada');
      }
      
      const bet = betDoc.data() as Bet;
      
      if (bet.status !== 'pending') {
        throw new Error('Solo se pueden cancelar apuestas pendientes');
      }
      
      // Devolver dinero al usuario
      const userRef = doc(db, 'users', bet.userId);
      const userDoc = await transaction.get(userRef);
      
      if (userDoc.exists()) {
        const user = userDoc.data() as User;
        transaction.update(userRef, {
          balance: user.balance + bet.amount,
        });
      }
      
      // Marcar apuesta como reembolsada
      transaction.update(betRef, {
        status: 'refunded',
      });
    });
  }

  // Cancelar todas las apuestas pendientes de una pelea
  async cancelAllPendingBets(fightId: string): Promise<void> {
    const pendingBets = await this.getByFight(fightId);
    const pendingOnly = pendingBets.filter(bet => bet.status === 'pending');
    
    if (pendingOnly.length === 0) {
      return;
    }

    const log: MatchingLog = {
      timestamp: Timestamp.now(),
      fightId,
      totalBets: pendingOnly.length,
      redBets: pendingOnly.filter(b => b.color === 'red').length,
      greenBets: pendingOnly.filter(b => b.color === 'green').length,
      totalMatches: 0,
      totalRefunded: pendingOnly.length,
      processingTime: 0,
      details: [`🚫 Cancelando todas las apuestas pendientes: ${pendingOnly.length} apuestas`]
    };

    await this.refundAllBets(pendingOnly, log);
  }

  // Obtener estadísticas de emparejamiento
  async getMatchingStats(fightId: string): Promise<{
    total: number;
    pending: number;
    matched: number;
    refunded: number;
    redTotal: number;
    greenTotal: number;
    efficiency: number;
  }> {
    const bets = await this.getByFight(fightId);
    
    const stats = {
      total: bets.length,
      pending: bets.filter(b => b.status === 'pending').length,
      matched: bets.filter(b => b.status === 'matched').length,
      refunded: bets.filter(b => b.status === 'refunded').length,
      redTotal: bets.filter(b => b.color === 'red').reduce((sum, b) => sum + b.amount, 0),
      greenTotal: bets.filter(b => b.color === 'green').reduce((sum, b) => sum + b.amount, 0),
      efficiency: 0
    };

    if (stats.total > 0) {
      stats.efficiency = (stats.matched / stats.total) * 100;
    }

    return stats;
  }

  // Logging del resultado
  private logMatchingResult(log: MatchingLog): void {
    if (MATCHING_CONFIG.ENABLE_DETAILED_LOGS) {
      console.log('📊 ===== MATCHING RESULT =====');
      console.log(`🎯 Fight ID: ${log.fightId}`);
      console.log(`⏱️ Processing time: ${log.processingTime}ms`);
      console.log(`📈 Total bets: ${log.totalBets} (${log.redBets} red, ${log.greenBets} green)`);
      console.log(`🤝 Matches: ${log.totalMatches}`);
      console.log(`🔄 Refunded: ${log.totalRefunded}`);
      console.log('📝 Details:');
      log.details.forEach(detail => console.log(`   ${detail}`));
      console.log('===========================');
    }
  }
}

export const betService = new BetService();
