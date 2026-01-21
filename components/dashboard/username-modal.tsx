"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateUsername } from "@/modules/auth/actions/friends"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export const UsernameModal = () => {
    const { data: session, update } = useSession()
    const [isOpen, setIsOpen] = useState(false)
    const [username, setUsername] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (session?.user && !session.user.username) {
            setIsOpen(true)
        } else {
            setIsOpen(false)
        }
    }, [session])

    const handleSubmit = async () => {
        if (username.length < 3) {
            toast.error("Username must be at least 3 characters")
            return
        }

        setLoading(true)
        const res = await updateUsername(username)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Username set successfully")
            await update() // Update session
            setIsOpen(false)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Set your Username</DialogTitle>
                    <DialogDescription>
                        You need a username to collaborate with friends.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <Input
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Username
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

