import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { User } from "@/types/user"
import { Skeleton } from "@/components/ui/skeleton"

interface UsersTableProps {
  users: User[]
  isLoading?: boolean
  isError?: Error | null
}

export function UsersTable({
  users,
  isLoading = false,
  isError = null,
}: UsersTableProps) {
  if (isError) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          Error loading users. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Updated At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-6 w-[200px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-[150px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-[100px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-[100px]" />
                </TableCell>
              </TableRow>
            ))
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-medium">{user.userId}</TableCell>
                <TableCell>{user.userName || "-"}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(user.updatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
