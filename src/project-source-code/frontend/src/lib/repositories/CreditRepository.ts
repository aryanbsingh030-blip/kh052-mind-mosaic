/**
 * CreditRepository (Stage 9)
 * Abstracts credit ledger and balance operations across online API and local IndexedDB.
 */

import { api, CreditBalanceInfo, CreditTransaction, CreditTransactionType } from "@/lib/api";
import { offlineStorage } from "@/lib/offline/indexedDb";
import { syncEngine } from "@/lib/sync/syncEngine";

export class CreditRepository {
  /**
   * Get student credit balance (online with IndexedDB fallback)
   */
  public async getBalance(studentId: string): Promise<CreditBalanceInfo> {
    try {
      const remote = await api.credits.getBalance(studentId);
      if (remote) {
        await offlineStorage.put("credits", remote);
      }
      return remote;
    } catch (err) {
      console.warn(`[CreditRepository] Remote balance failed for ${studentId}, fetching from IndexedDB:`, err);
      const local = await offlineStorage.get<CreditBalanceInfo>("credits", studentId);
      if (local) {
        return local;
      }
      return {
        student_id: studentId,
        student_name: "Student",
        credit_balance: 100,
        total_earned: 0,
        total_spent: 0,
        allow_negative_balance: false,
        recent_transactions: [],
      };
    }
  }

  /**
   * Get transaction ledger (online with IndexedDB fallback)
   */
  public async getLedger(
    studentId: string,
    params?: { transaction_type?: CreditTransactionType; limit?: number; offset?: number }
  ): Promise<CreditTransaction[]> {
    try {
      const remote = await api.credits.getLedger(studentId, params);
      if (Array.isArray(remote)) {
        for (const tx of remote) {
          await offlineStorage.put("transactions", tx);
        }
      }
      return remote;
    } catch (err) {
      console.warn(`[CreditRepository] Remote ledger failed for ${studentId}, reading from IndexedDB:`, err);
      let all = await offlineStorage.getAll<CreditTransaction>("transactions");
      all = all.filter((tx) => tx.student === studentId || (tx as any).student_id === studentId);
      if (params?.transaction_type) {
        all = all.filter((tx) => tx.type === params.transaction_type);
      }
      return all;
    }
  }

  /**
   * Transfer credits between students (offline-capable with negative-balance checks)
   */
  public async transfer(
    fromStudentId: string,
    toStudentId: string,
    amount: number,
    description: string
  ): Promise<CreditTransaction> {
    try {
      const remote = await api.credits.transfer(fromStudentId, {
        to_student_id: toStudentId,
        amount,
        description,
      });
      await offlineStorage.put("transactions", remote);
      return remote;
    } catch (err: any) {
      console.warn("[CreditRepository] Offline transfer execution:", err);

      // Local negative-balance check
      const senderBal = await this.getBalance(fromStudentId);
      if (senderBal.credit_balance < amount && !senderBal.allow_negative_balance) {
        throw new Error(
          `Insufficient credit balance (${senderBal.credit_balance} available, ${amount} required). System prohibits negative balances.`
        );
      }

      // Perform local simulated transfer
      senderBal.credit_balance -= amount;
      senderBal.total_spent += amount;
      await offlineStorage.put("credits", senderBal);

      const receiverBal = await this.getBalance(toStudentId);
      receiverBal.credit_balance += amount;
      receiverBal.total_earned += amount;
      await offlineStorage.put("credits", receiverBal);

      const tx: CreditTransaction = {
        id: `tx-offline-${Date.now()}`,
        student: fromStudentId,
        student_id: fromStudentId,
        amount,
        type: "SESSION_TRANSFER" as any,
        reason: description,
        timestamp: new Date().toISOString(),
        related_session_id: null,
      };
      await offlineStorage.put("transactions", tx);

      // Queue sync via Stage 10 Sync Engine
      await syncEngine.enqueueOperation("CREDIT_TRANSACTION", tx.id, {
        from_student_id: fromStudentId,
        to_student_id: toStudentId,
        amount,
        description,
      });

      return tx;
    }
  }
}

export const creditRepository = new CreditRepository();
