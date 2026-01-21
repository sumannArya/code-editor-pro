"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/ui/tabs"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/ui/avatar"
import { UserPlus, Users, Check, X, Loader2, Code2 } from "lucide-react"
import { searchUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, getFriends } from "@/modules/auth/actions/friends"
import { getCollabInvites, respondToCollabInvite } from "@/modules/auth/actions/collab"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/ui/scroll-area"

export const FriendsPopover = () => {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [friends, setFriends] = useState<any[]>([])
    const [invites, setInvites] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("friends")

    // Fetch data when popover opens or tab changes
    useEffect(() => {
        if (open) {
            refreshData()
        }
    }, [open, activeTab])

    const refreshData = async () => {
        setLoading(true)
        if (activeTab === "requests") {
            const reqs = await getFriendRequests()
            setRequests(reqs)
        } else if (activeTab === "friends") {
            const frnds = await getFriends()
            setFriends(frnds)
        } else if (activeTab === "invites") {
            const invitations = await getCollabInvites()
            setInvites(invitations)
        }
        setLoading(false)
    }

    const handleSearch = async () => {
        if (searchQuery.length < 3) return
        setLoading(true)
        const res = await searchUsers(searchQuery)
        setSearchResults(res)
        setLoading(false)
    }

    const handleSendRequest = async (receiverId: string) => {
        const res = await sendFriendRequest(receiverId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Request sent")
            setSearchResults(searchResults.filter(u => u.id !== receiverId))
        }
    }

    const handleAccept = async (id: string) => {
        const res = await acceptFriendRequest(id)
        if (res.error) toast.error(res.error)
        else {
            toast.success("Accepted")
            refreshData()
        }
    }

    const handleReject = async (id: string) => {
        const res = await rejectFriendRequest(id)
        if (res.error) toast.error(res.error)
        else {
            toast.success("Rejected")
            refreshData()
        }
    }

    const handleAcceptInvite = async (id: string) => {
        const res = await respondToCollabInvite(id, "ACCEPTED")
        if (res.error) toast.error(res.error)
        else if (res.playgroundId) {
            toast.success("Joining playground...")
            setOpen(false)
            router.push(`/playground/${res.playgroundId}`)
        }
    }

    const handleRejectInvite = async (id: string) => {
        const res = await respondToCollabInvite(id, "REJECTED")
        if (res.error) toast.error(res.error)
        else {
            toast.success("Invite rejected")
            refreshData()
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <UserPlus className="h-5 w-5" />
                    {(requests.length > 0 || invites.length > 0) && (
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="border-b px-4 py-2">
                        <TabsList className="w-full">
                            <TabsTrigger value="friends" className="flex-1">Friends</TabsTrigger>
                            <TabsTrigger value="requests" className="flex-1">Requests {requests.length > 0 && `(${requests.length})`}</TabsTrigger>
                            <TabsTrigger value="invites" className="flex-1">Invites {invites.length > 0 && `(${invites.length})`}</TabsTrigger>
                            <TabsTrigger value="add" className="flex-1">Add</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="h-[300px]">
                        <TabsContent value="friends" className="p-4 m-0">
                            {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
                                friends.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No friends yet</p> : (
                                    <div className="space-y-3">
                                        {friends.map(friend => (
                                            <div key={friend.id} className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={friend.image || ""} />
                                                    <AvatarFallback>{friend.name?.[0] || "?"}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{friend.name}</span>
                                                    <span className="text-xs text-muted-foreground">@{friend.username}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </TabsContent>

                        <TabsContent value="requests" className="p-4 m-0">
                            {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
                                requests.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No pending requests</p> : (
                                    <div className="space-y-3">
                                        {requests.map(req => (
                                            <div key={req.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={req.sender.image || ""} />
                                                        <AvatarFallback>{req.sender.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{req.sender.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50" onClick={() => handleAccept(req.id)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleReject(req.id)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </TabsContent>

                        <TabsContent value="invites" className="p-4 m-0">
                            {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
                                invites.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No pending invites</p> : (
                                    <div className="space-y-3">
                                        {invites.map(invite => (
                                            <div key={invite.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={invite.sender.image || ""} />
                                                        <AvatarFallback>{invite.sender.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{invite.sender.name}</span>
                                                        <span className="text-xs text-muted-foreground">invited to code</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50" onClick={() => handleAcceptInvite(invite.id)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleRejectInvite(invite.id)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </TabsContent>

                        <TabsContent value="add" className="p-4 m-0">
                            <div className="flex gap-2 mb-4">
                                <Input
                                    placeholder="Search username..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                                <Button size="icon" onClick={handleSearch} disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {searchResults.map(user => (
                                    <div key={user.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.image || ""} />
                                                <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">@{user.username}</span>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary" onClick={() => handleSendRequest(user.id)}>
                                            Add
                                        </Button>
                                    </div>
                                ))}
                                {searchResults.length === 0 && searchQuery && !loading && (
                                    <p className="text-center text-sm text-muted-foreground">No users found</p>
                                )}
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </PopoverContent>
        </Popover>
    )
}
