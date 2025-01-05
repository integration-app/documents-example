export interface LedgerAccount {
  _id: string;
  name: string;
  externalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerAccountsResponse {
  ledgerAccounts: LedgerAccount[];
} 