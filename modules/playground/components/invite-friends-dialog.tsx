"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, UserPlus, Check } from "lucide-react"
import { getFriends } from "@/modules/auth/actions/friends"
import { sendCollabInvite } from "@/modules/auth/actions/collab"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Friend {
    id: string
    name: string | null
    username: string | null
    image: string | null
}

export const InviteFriendsDialog = ({ playgroundId, children }: { playgroundId: string, children: React.ReactNode }) => {
    const [open, setOpen] = useState(false)
    const [friends, setFriends] = useState<Friend[]>([])
    const [loading, setLoading] = useState(false)
    const [sendingInvite, setSendingInvite] = useState<string | null>(null) // friendId
    const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (open) {
            loadFriends()
        }
    }, [open])

    const loadFriends = async () => {
        setLoading(true)
        try {
            const data = await getFriends()
            setFriends(data)
        } catch (error) {
            toast.error("Failed to load friends")
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async (friendId: string) => {
        setSendingInvite(friendId)
        try {
            const result = await sendCollabInvite(friendId, playgroundId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Invite sent!")
                setInvitedFriends(prev => new Set(prev).add(friendId))
            }
        } catch (error) {
            toast.error("Failed to send invite")
        } finally {
            setSendingInvite(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite Friends</DialogTitle>
                    <DialogDescription>
                        Invite your friends to collaborate on this playground.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : friends.length === 0 ? (
                        <div className="text-center text-muted-foreground p-4">
                            No friends found. Add friends from the dashboard first.
                        </div>
                    ) : (
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-4">
                                {friends.map(friend => (
                                    <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={friend.image || ""} />
                                                <AvatarFallback>{friend.name?.[0] || friend.username?.[0] || "?"}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{friend.name}</p>
                                                <p className="text-sm text-muted-foreground">@{friend.username}</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={invitedFriends.has(friend.id) ? "secondary" : "default"}
                                            disabled={invitedFriends.has(friend.id) || sendingInvite === friend.id}
                                            onClick={() => handleInvite(friend.id)}
                                        >
                                            {invitedFriends.has(friend.id) ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-1" /> Sent
                                                </>
                                            ) : sendingInvite === friend.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserPlus className="h-4 w-4 mr-1" /> Invite
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

