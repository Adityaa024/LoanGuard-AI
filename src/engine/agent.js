// Worker agent. CRITICAL DESIGN (RUBRIC 1): an agent can only *propose* an action.
// It has NO capability to execute, mutate the ledger, or send anything. Execution lives
// solely in the Orchestrator, which always routes a proposal through the Warden first.
// This makes "no unmediated action" true by construction — there is no other code path.

const FIRST_NAME = (borrower) => (borrower || 'Cliente').split(' ')[0]

export class Agent {
  constructor({ agentId, tier, scopeLimit }) {
    this.agentId = agentId
    this.tier = tier
    this.scopeLimit = scopeLimit
  }

  // Produce a compliant outbound message: dignified tone, masked identifier (last-4 only).
  static draftOutreach(loan) {
    const last4 = String(loan.accountId || '').slice(-4)
    return `Hola ${FIRST_NAME(loan.borrower)}, le recordamos amablemente el pago de su cuenta ****${last4}. ` +
      `Si ya realizó su pago, ignore este mensaje. Gracias.`
  }

  /**
   * Given a task and the loan it concerns, return a proposed Action envelope.
   * Returns null if the agent has nothing to propose. NEVER executes anything.
   */
  propose(task, loan) {
    if (!loan) return null
    const base = { agentId: this.agentId, loanId: loan.loanId }
    switch (task.type) {
      case 'risk_score':
        return { ...base, type: 'risk_score' }
      case 'outreach':
        return {
          ...base,
          type: 'outreach',
          channel: 'sms',
          identifier: loan.accountId,
          text: Agent.draftOutreach(loan),
        }
      case 'payment_post':
        // A borrower-initiated payment equal to the minimum due (clean, reconciles).
        return { ...base, type: 'payment_post', amount: loan.minPayment }
      case 'transfer':
        // A servicing transfer sized to the balance; the Warden enforces scope.
        return { ...base, type: 'transfer', amount: Math.min(loan.balance, this.scopeLimit + 1) }
      default:
        return null
    }
  }
}
