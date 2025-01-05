"use client"

import { UsersTable } from "./components/users-table"
import { useUsers } from "@/hooks/use-users"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"

export default function UsersPage() {
  const { users, isLoading, isError, importUsers } = useUsers()
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async () => {
    try {
      setIsImporting(true)
      await importUsers()
    } catch (error) {
      console.error("Failed to import users:", error)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage your users</p>
          </div>
          <Button onClick={handleImport} disabled={isImporting}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isImporting ? "animate-spin" : ""}`}
            />
            {isImporting ? "Importing..." : "Import Users"}
          </Button>
        </div>
        <UsersTable users={users} isLoading={isLoading} isError={isError} />
      </div>
    </div>
  )
}
