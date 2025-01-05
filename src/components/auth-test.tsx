"use client"

import { useState } from "react"
import { useAuth } from "@/app/auth-provider"

export function AuthTest() {
  const { customerId, customerName, setCustomerName } = useAuth()
  const [nameInput, setNameInput] = useState("")

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Test Customer</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
          This customer id and name will be used to connect external apps and
          run integrations.
        </p>
        <p className="font-mono text-sm">
          Customer ID: {customerId || "Loading..."}
        </p>
        <p>Name: {customerName || "Not set"}</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Enter customer name"
          className="px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
        />
        <button
          onClick={() => {
            if (nameInput.trim()) {
              setCustomerName(nameInput.trim())
              setNameInput("")
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Update Name
        </button>
      </div>
    </div>
  )
}
